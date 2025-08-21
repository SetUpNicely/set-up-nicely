// 📍 src/aggregateMinutesToParquet.ts
import { Storage, File } from "@google-cloud/storage";
import { DateTime } from "luxon";
import * as zlib from "zlib";
import * as fs from "fs";
import * as path from "path";
import { parse as csvParse } from "@fast-csv/parse";
import * as os from "os";
import { ParquetSchema, ParquetWriter } from "parquetjs-lite";

type MinuteRow = Record<string, string | number>;

type Session = "RTH" | "EXTENDED";
type TF = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";
type DayBarTimestampMode = "ET_MIDNIGHT" | "SESSION_CLOSE";

const storage = new Storage();

const PARQUET_SCHEMA = new ParquetSchema({
  t:       { type: "INT64"  }, // ms epoch UTC
  o:       { type: "DOUBLE" },
  h:       { type: "DOUBLE" },
  l:       { type: "DOUBLE" },
  c:       { type: "DOUBLE" },
  v:       { type: "INT64"  },
  vw:      { type: "DOUBLE", optional: true },
  symbol:  { type: "UTF8" },
  tf:      { type: "UTF8" },
  session: { type: "UTF8" },
});

/* ---------- small retry helpers ---------- */

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

function isTransientGcsErr(e: any): boolean {
  const code = Number((e && (e.code ?? e.statusCode)) ?? NaN);
  if ([429, 500, 502, 503, 504].includes(code)) return true;
  const msg = String(e?.message || e || "");
  return /ECONNRESET|socket hang up|ETIMEDOUT|EAI_AGAIN|TLSWrap|Network/i.test(msg);
}

async function withRetry<T>(fn: () => Promise<T>, label: string, max = 5): Promise<T> {
  let delay = 500;
  for (let attempt = 1; attempt <= max; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      if (attempt === max || !isTransientGcsErr(e)) throw e;
      console.warn(`⏳ ${label} retry ${attempt}/${max - 1}: ${e?.code ?? ""} ${e?.message ?? e}`);
      await sleep(delay);
      delay = Math.min(delay * 2, 5000);
    }
  }
  // unreachable
  throw new Error(`withRetry exhausted for ${label}`);
}

async function streamCsvWithRetry(file: File, onRow: (row: MinuteRow) => void, label: string) {
  const runOnce = () =>
    new Promise<void>((resolve, reject) => {
      const isGz = file.name.endsWith(".gz");
      const input = file.createReadStream();
      const stream = isGz ? input.pipe(zlib.createGunzip()) : input;

      stream
        .pipe(csvParse({ headers: true, ignoreEmpty: true, trim: true }))
        .on("data", (row: MinuteRow) => onRow(row))
        .on("end", resolve)
        .on("error", reject);
    });

  await withRetry(runOnce, label, 5);
}

/* ---------- main aggregator ---------- */

export async function aggregateOneTickerDayToParquet(opts: {
  rawBucket: string;                // e.g. set-up-nicely-flatfiles
  symbol: string;                   // e.g. AAPL
  date: string;                     // YYYY-MM-DD (trading date, ET)
  outBucket: string;                // e.g. set-up-nicely-agg
  session: Session;                 // "RTH" | "EXTENDED"
  tfs: TF[];                        // e.g. ["1d","5m","15m","1h","4h"]
  computeVWAP?: boolean;            // default false
  dropPartialFinalBucket?: boolean; // default true for intraday RTH
  minutesAreUTC?: boolean;          // your minute timestamps are UTC-based (true for Polygon)
  // session tweaks
  dayBarTimestampMode?: DayBarTimestampMode; // default "SESSION_CLOSE"
  etSessionOverride?: { start?: string; end?: string }; // e.g., { end: "13:00" } on half-days
  // input layout hints (provide one or more; it will try in order)
  byDateBasePrefix?: string | undefined;      // "minute" → minute/<date>/<symbol>.csv(.gz)
  byTickerBasePrefix?: string | undefined;    // "raw/1m" → raw/1m/symbol=AAPL/dt=<date>/*.csv(.gz)
  byTickerAltBasePrefix?: string | undefined; // "minute_by_ticker" → minute_by_ticker/AAPL/(YYYY/)?<date>*.csv(.gz)
  // QC
  logQC?: boolean;                  // default true
}) {
  const {
    rawBucket, symbol, date, outBucket, session, tfs,
    computeVWAP = false,
    dropPartialFinalBucket = true,
    // minutesAreUTC is true for Polygon, but we normalize robustly anyway
    minutesAreUTC = true,
    dayBarTimestampMode = "SESSION_CLOSE",
    etSessionOverride,
    byDateBasePrefix,
    byTickerBasePrefix,
    byTickerAltBasePrefix,
    logQC = true,
  } = opts;

  // 🚫 Enforce "no RTH for 4h timeframe"
  const effectiveTFs = tfs.filter(tf => !(tf === "4h" && session === "RTH"));
  if (!effectiveTFs.length) return;

  const files = await findMinuteFiles(rawBucket, symbol, date, {
    byDateBasePrefix, byTickerBasePrefix, byTickerAltBasePrefix
  });
  if (!files.length) {
    console.warn("⚠️ No minute files found for", symbol, date);
    return;
  }

  // --- session window in ET ---
  const dayStartEt = DateTime.fromISO(date, { zone: "America/New_York" }).startOf("day");
  let sessStartEt = session === "RTH"
    ? dayStartEt.set({ hour: 9, minute: 30 })
    : dayStartEt.set({ hour: 4, minute: 0 });
  let sessEndEt = session === "RTH"
    ? dayStartEt.set({ hour: 16, minute: 0 })
    : dayStartEt.set({ hour: 20, minute: 0 });

  if (etSessionOverride?.start) {
    const [hh, mm] = etSessionOverride.start.split(":").map(Number);
    if (!Number.isNaN(hh)) sessStartEt = dayStartEt.set({ hour: hh, minute: mm || 0 });
  }
  if (etSessionOverride?.end) {
    const [hh, mm] = etSessionOverride.end.split(":").map(Number);
    if (!Number.isNaN(hh)) sessEndEt = dayStartEt.set({ hour: hh, minute: mm || 0 });
  }

  const inSessionEt = (tsUtcMs: number) => {
    const tsEt = DateTime.fromMillis(tsUtcMs, { zone: "America/New_York" });
    return tsEt >= sessStartEt && tsEt < sessEndEt;
  };

  const floorToBucketStartEt = (tsUtcMs: number, tf: TF): number => {
    const dtEt = DateTime.fromMillis(tsUtcMs, { zone: "America/New_York" });
    if (tf === "1d") return dayStartEt.toUTC().toMillis();

    const mins = dtEt.minute + dtEt.hour * 60;
    const step =
      tf === "1m" ? 1 :
      tf === "5m" ? 5 :
      tf === "15m" ? 15 :
      tf === "30m" ? 30 :
      tf === "1h" ? 60 : 240;

    // Fixed blocks for EXTENDED 4h: 04–08, 08–12, 12–16, 16–20
    if (tf === "4h" && session === "EXTENDED") {
      const blk = mins < 8 * 60 ? 4 : mins < 12 * 60 ? 8 : mins < 16 * 60 ? 12 : 16;
      return dayStartEt.set({ hour: blk }).toUTC().toMillis();
    }

    const baseMins = Math.floor(mins / step) * step;
    const h = Math.floor(baseMins / 60);
    const m = baseMins % 60;
    return DateTime.fromObject(
      { year: dtEt.year, month: dtEt.month, day: dtEt.day, hour: h, minute: m },
      { zone: "America/New_York" }
    ).toUTC().toMillis();
  };

  // Accumulators per TF → bucketStartMs
  type Acc = { t:number; o:number; h:number; l:number; c:number; v:number; nsum?:number; vsum?:number; };
  const books: Record<TF, Map<number, Acc>> =
    Object.fromEntries(effectiveTFs.map(tf => [tf, new Map<number, Acc>()])) as any;

  // QC trackers
  let dupes = 0;
  let processed = 0;
  const minuteSeen = new Set<number>(); // normalized to minute boundary (UTC ms)

  // ---- helpers to normalize CSV row fields ----
  const toNumber = (x: any): number => {
    if (x == null || x === "") return NaN;
    const n = typeof x === "number" ? x : Number(String(x).trim());
    return Number.isFinite(n) ? n : NaN;
  };

  const toMillis = (x: any): number => {
    if (x == null) return NaN;
    const s = String(x).trim();
    // ISO?
    if (s.includes("T") || s.includes("-")) {
      const dt = DateTime.fromISO(s, { zone: "utc" });
      return dt.isValid ? dt.toMillis() : NaN;
    }
    // numeric
    const n = Number(s);
    if (!Number.isFinite(n)) return NaN;
    // Heuristics: ns -> /1e6, µs -> /1e3, sec -> *1e3, ms -> keep
    if (n > 1e16) return Math.floor(n / 1e6); // ns → ms
    if (n > 1e13) return Math.floor(n / 1e3); // µs → ms
    if (n > 1e12) return Math.floor(n);       // already ms (but large)
    if (n > 1e10) return Math.floor(n);       // ms
    if (n > 1e9)  return Math.floor(n * 1000); // seconds → ms
    return Math.floor(n);
  };

  const pushMinute = (row: MinuteRow) => {
    // 🔒 Guard: drop rows whose symbol doesn't match the requested symbol
    const rowSymAny = row["ticker"] ?? row["symbol"];
    if (rowSymAny != null) {
      const rowSym = String(rowSymAny).trim().toUpperCase();
      if (rowSym && rowSym !== symbol.toUpperCase()) return;
    }

    // Accept multiple header styles:
    // - Polygon flatfiles: ticker,volume,open,close,high,low,window_start,transactions
    // - Our prior style:   timestamp,open,high,low,close,volume
    const tsRaw = row["timestamp"] ?? row["window_start"] ?? row["t"] ?? row["start"] ?? row["start_ts"];
    const tsUtc = toMillis(tsRaw);
    if (!Number.isFinite(tsUtc)) return; // skip bad row

    // Note: Polygon order is open,close,high,low (not OHLC).
    const open  = toNumber(row["open"] ?? row["o"]);
    const close = toNumber(row["close"] ?? row["c"]);
    const high  = toNumber(row["high"] ?? row["h"]);
    const low   = toNumber(row["low"]  ?? row["l"]);
    const vol   = toNumber(row["volume"] ?? row["v"]);

    if (!Number.isFinite(open) || !Number.isFinite(high) || !Number.isFinite(low) || !Number.isFinite(close) || !Number.isFinite(vol)) {
      return; // incomplete row
    }

    if (!inSessionEt(tsUtc)) return;

    // QC normalization by minute boundary in ET, then back to UTC
    const normEt = DateTime.fromMillis(tsUtc, { zone: "America/New_York" }).startOf("minute");
    const normUtc = normEt.toUTC().toMillis();
    if (minuteSeen.has(normUtc)) dupes++; else minuteSeen.add(normUtc);
    processed++;

    for (const tf of effectiveTFs) {
      const bucket = floorToBucketStartEt(tsUtc, tf);
      let acc = books[tf].get(bucket);
      if (!acc) {
        acc = { t: bucket, o: open, h: high, l: low, c: close, v: vol };
        if (computeVWAP) { acc.nsum = ((high + low + close) / 3) * vol; acc.vsum = vol; }
        books[tf].set(bucket, acc);
      } else {
        acc.h = Math.max(acc.h, high);
        acc.l = Math.min(acc.l, low);
        acc.c = close;
        acc.v += vol;
        if (computeVWAP && acc.nsum != null && acc.vsum != null) {
          acc.nsum += ((high + low + close) / 3) * vol;
          acc.vsum += vol;
        }
      }
    }
  };

  // --- stream CSV(.gz) files (with retry) ---
  for (const file of files) {
    await streamCsvWithRetry(
      file,
      (row) => pushMinute(row),
      `read ${symbol} ${date} ${session} from gs://${file.bucket.name}/${file.name}`
    );
  }

  // QC: compute gaps (expected minutes minus seen)
  if (logQC) {
    let expected = 0;
    let cursor = sessStartEt;
    while (cursor < sessEndEt) {
      expected += 1;
      cursor = cursor.plus({ minutes: 1 });
    }
    const gaps = Math.max(0, expected - minuteSeen.size);
    console.warn(`QC ${symbol} ${date} session=${session} processed=${processed} dupes=${dupes} gaps=${gaps} seen=${minuteSeen.size}/${expected}`);
  }

  // Optionally drop a trailing partial bucket for intraday TFs on RTH
  const intradayTFs: TF[] = ["1m", "5m", "15m", "30m", "1h", "4h"];
  if (session === "RTH" && dropPartialFinalBucket) {
    for (const tf of effectiveTFs) {
      if (!intradayTFs.includes(tf)) continue;
      const map = books[tf];
      if (map.size) {
        const lastKey = Math.max(...Array.from(map.keys()));
        const endEt =
          tf === "5m"  ? DateTime.fromMillis(lastKey, { zone: "utc" }).setZone("America/New_York").plus({ minutes: 5 })  :
          tf === "15m" ? DateTime.fromMillis(lastKey, { zone: "utc" }).setZone("America/New_York").plus({ minutes: 15 }) :
          tf === "30m" ? DateTime.fromMillis(lastKey, { zone: "utc" }).setZone("America/New_York").plus({ minutes: 30 }) :
          tf === "1h"  ? DateTime.fromMillis(lastKey, { zone: "utc" }).setZone("America/New_York").plus({ hours: 1 })    :
                         DateTime.fromMillis(lastKey, { zone: "utc" }).setZone("America/New_York").plus({ hours: 4 });
        if (endEt > sessEndEt) map.delete(lastKey);
      }
    }
  }

  // --- write Parquet per TF (one day shard each) ---
  for (const tf of effectiveTFs) {
    const rowsRaw = Array.from(books[tf].values()).sort((a, b) => a.t - b.t);

    // For 1d, set timestamp per mode (either ET midnight or session close)
    const rows = (tf === "1d")
      ? rowsRaw.map(r => ({
          t: dayBarTimestampMode === "SESSION_CLOSE" ? sessEndEt.toUTC().toMillis() : dayStartEt.toUTC().toMillis(),
          o: r.o, h: r.h, l: r.l, c: r.c, v: Math.round(r.v),
          vw: computeVWAP && r.nsum != null && r.vsum ? r.nsum / r.vsum : undefined,
          symbol, tf, session,
        }))
      : rowsRaw.map(r => ({
          t: r.t,
          o: r.o, h: r.h, l: r.l, c: r.c, v: Math.round(r.v),
          vw: computeVWAP && r.nsum != null && r.vsum ? r.nsum / r.vsum : undefined,
          symbol, tf, session,
        }));

    if (!rows.length) {
      console.warn("No rows for", symbol, date, tf, session);
      continue;
    }

    const outDir =
      tf === "1d"
        ? `agg/1d/session=${session}/symbol=${symbol}/month=${date.slice(0, 7)}/day=${date}`
        : `agg/${tf}/session=${session}/symbol=${symbol}/month=${date.slice(0, 7)}/day=${date}`;

    const tmpPath = path.join(os.tmpdir(), `${symbol}_${date}_${tf}_${session}.parquet`);
    await writeParquetLocal(tmpPath, rows);

    const outPath = `${outDir}/part-000.parquet`;
    const outFile = storage.bucket(outBucket).file(outPath);

    // cheap “already done?” check
    const [exists] = await withRetry(
      () => outFile.exists().then(([e]) => [e] as [boolean]),
      `head ${symbol} ${date} ${tf} ${session}`
    );

    if (!(exists && process.env.SKIP_IF_EXISTS === "true")) {
      const buf = fs.readFileSync(tmpPath);
      const customTimeIso = `${date}T00:00:00Z`; // lifecycle by data date

      await withRetry(
        () => outFile.save(buf, {
          resumable: false,
          contentType: "application/octet-stream",
          metadata: { customTime: customTimeIso, cacheControl: "no-store" },
          preconditionOpts: { ifGenerationMatch: 0 }, // idempotent: don't overwrite
        }),
        `save ${symbol} ${date} ${tf} ${session}`
      );
    }

    // ALWAYS clean up tmp file
    try { fs.unlinkSync(tmpPath); } catch {}
  }
}

/* ---------- helpers ---------- */

// Exact-first, strict-basenames fallback finder.
// Prevents wildcard-y matches like .../NTR* pulling NTRA.csv or NTRS.csv.
// replace your current findMinuteFiles with this:
async function findMinuteFiles(
  rawBucket: string,
  symbol: string,
  date: string, // YYYY-MM-DD
  opts: {
    byDateBasePrefix?: string;      // e.g. "minute"
    byTickerBasePrefix?: string;    // ignored
    byTickerAltBasePrefix?: string; // ignored
  }
): Promise<File[]> {
  const bucket = storage.bucket(rawBucket);
  const base = opts.byDateBasePrefix || "minute";

  // Try exact .csv then .csv.gz under minute/<date>/<symbol>.<ext>
  const candidates = [
    `${base}/${date}/${symbol}.csv`,
    `${base}/${date}/${symbol}.csv.gz`,
  ];

  for (const name of candidates) {
    const f = bucket.file(name);
    const [exists] = await withRetry(
      () => f.exists().then(([e]) => [e] as [boolean]),
      `head ${name}`
    );
    if (exists) {
      console.log(`📦 Using exact file: gs://${rawBucket}/${name}`);
      return [f];
    }
  }

  console.warn(`⚠️ No by-date minute file found for ${symbol} ${date} under gs://${rawBucket}/${base}/${date}/`);
  return [];
}


async function writeParquetLocal(localPath: string, rows: any[]) {
  const writer = await ParquetWriter.openFile(PARQUET_SCHEMA, localPath, { useDataPageV2: false });
  for (const r of rows) await writer.appendRow(r);
  await writer.close();
}
