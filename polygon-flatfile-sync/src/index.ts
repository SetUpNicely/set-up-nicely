// 📍 polygon-flatfile-sync/src/index.ts

import {
  S3Client,
  GetObjectCommand,
  ListObjectsV2Command,
  GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { Storage } from "@google-cloud/storage";
import * as zlib from "zlib";
import * as readline from "readline";
import { Readable } from "stream";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import { NodeHttpHandler } from "@smithy/node-http-handler";

// ---------- process safety ----------
process.on("unhandledRejection", (e) => {
  console.error("🔥 UnhandledRejection:", e instanceof Error ? e.stack || e.message : e);
});
process.on("uncaughtException", (e) => {
  console.error("🔥 UncaughtException:", e instanceof Error ? e.stack || e.message : e);
});

// ---------- config ----------
const GCS_BUCKET_NAME = "set-up-nicely-flatfiles";
const GCS_ALLOWED_FILE = "allowed/allowedTickers.json";

// Polygon S3 (do not change unless Polygon changes)
const S3_ENDPOINT = "https://files.polygon.io";
const S3_BUCKET = "flatfiles";
const S3_PREFIX = "us_stocks_sip/minute_aggs_v1";

// Tunables (env overrides)
const BACKFILL_DAYS = Number(process.env.BACKFILL_DAYS) || 370;              // N past days (skip today)
const YESTERDAY_WAIT_MIN = Number(process.env.YESTERDAY_WAIT_MIN) || 60;   // allow delay for yesterday file
const RETRY_MAX_WAIT_MIN = Number(process.env.RETRY_MAX_WAIT_MIN) || 15;   // cap exponential backoff
const DAY_CONCURRENCY = Math.max(1, Math.min(8, Number(process.env.DAY_CONCURRENCY) || 3)); // 2–4 recommended

// ---------- GCS prefixes (new) ----------
const MINUTE_BY_DATE_PREFIX = "minute";                 // minute/YYYY-MM-DD/TICKER.csv
const MINUTE_BY_TICKER_PREFIX = "minute_by_ticker";     // minute_by_ticker/TICKER/YYYY/YYYY-MM-DD.csv

// ---------- helpers ----------
function resolveSecret(maybePath?: string): string {
  if (!maybePath) throw new Error("Missing secret env var");
  try {
    if (fs.existsSync(maybePath)) return fs.readFileSync(maybePath, "utf8").trim();
  } catch {}
  return String(maybePath).trim();
}

const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

function fmtUTC(d: Date) {
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return {
    yyyy,
    mm,
    dd,
    fileName: `${yyyy}-${mm}-${dd}.csv.gz`,
    dateStr: `${yyyy}-${mm}-${dd}`,
  };
}

async function streamToString(stream: any) {
  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    if (!stream?.on) return resolve("");
    stream.on("data", (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function isSoftMissingError(err: any): boolean {
  const status = err?.$metadata?.httpStatusCode;
  const name = err?.name;
  return name === "NoSuchKey" || status === 404 || status === 400;
}

function isHardAuthError(err: any): boolean {
  const status = err?.$metadata?.httpStatusCode;
  return status === 401 || status === 403;
}

// Wrapper to ensure each S3 send has a hard timeout (prevents hangs)
async function sendWithTimeout<T>(client: S3Client, command: any, ms: number): Promise<T> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    // @ts-expect-error aws-sdk v3 accepts abortSignal here
    return await client.send(command, { abortSignal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getS3ObjectWithRetry(
  s3: S3Client,
  bucket: string,
  key: string,
  maxMinutesToWait: number
): Promise<GetObjectCommandOutput | undefined> {
  const deadline = Date.now() + maxMinutesToWait * 60_000;
  let attempt = 0;

  while (true) {
    attempt++;
    try {
      console.log(`🔎 Attempt ${attempt}: GetObject s3://${bucket}/${key}`);

      const res = await sendWithTimeout<GetObjectCommandOutput>(
        s3,
        new GetObjectCommand({ Bucket: bucket, Key: key }),
        30_000
      );

      console.log(
        `✅ GetObject OK s3://${bucket}/${key} (ContentLength=${(res as any)?.ContentLength ?? "unknown"})`
      );
      return res;
    } catch (err: any) {
      if (err?.$response?.body) {
        try {
          const raw = await streamToString(err.$response.body);
          if (raw) console.error("📄 S3 error body (truncated):", raw.slice(0, 500));
        } catch {}
      }

      if (err?.name === "AbortError" || err?.name === "TimeoutError") {
        console.log("⏱️ GetObject attempt timed out; will retry with backoff.");
      } else if (isHardAuthError(err)) {
        console.error("❌ Auth error fetching S3 object:", err?.name, err?.$metadata?.httpStatusCode);
        throw err; // do not retry
      } else if (!isSoftMissingError(err)) {
        console.error("❌ Non-soft GetObject error:", err?.name, err?.$metadata?.httpStatusCode, err?.message);
        throw err;
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        console.log(`⛔ File still not available after ${maxMinutesToWait}m: ${key}`);
        return undefined;
      }

      const wait = Math.min(
        Math.pow(2, Math.min(attempt - 1, 4)) * 60_000,
        RETRY_MAX_WAIT_MIN * 60_000,
        remaining
      );
      console.log(`⏳ Not ready. Backing off ${Math.round(wait / 60000)}m...`);
      await sleep(wait);
    }
  }
}

// Simple concurrency pool for day tasks
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  task: (item: T, idx: number) => Promise<void>
) {
  let i = 0;
  const workers: Promise<void>[] = [];
  const work = async (w: number) => {
    while (i < items.length) {
      const idx = i++;
      const item = items[idx];
      try {
        await task(item, idx);
      } catch (e: any) {
        console.error(`❗ Worker ${w}: item ${idx} failed:`, e?.message || e);
      }
    }
  };
  for (let w = 0; w < limit; w++) workers.push(work(w));
  await Promise.all(workers);
}

// ---------- main ----------
async function main() {
  // AWS creds
  const accessKeyId = resolveSecret(process.env.AWS_ACCESS_KEY_ID);
  const secretAccessKey = resolveSecret(process.env.AWS_SECRET_ACCESS_KEY);
  const sessionToken = process.env.AWS_SESSION_TOKEN
    ? resolveSecret(process.env.AWS_SESSION_TOKEN)
    : undefined;

  console.log("🔐 AWS creds check:", {
    akLen: accessKeyId?.length ?? 0,
    skLen: secretAccessKey?.length ?? 0,
    hasToken: !!sessionToken,
  });

  const s3 = new S3Client({
    region: "us-east-1",
    endpoint: S3_ENDPOINT,
    forcePathStyle: true,
    credentials: sessionToken
      ? { accessKeyId, secretAccessKey, sessionToken }
      : { accessKeyId, secretAccessKey },
    requestHandler: new NodeHttpHandler({
      connectionTimeout: 5_000,
      requestTimeout: 30_000,
    }),
  });

  // Canary: verify endpoint/creds quickly (okay if it fails)
  try {
    const list = await s3.send(
      new ListObjectsV2Command({
        Bucket: S3_BUCKET,
        MaxKeys: 1,
        Prefix: `${S3_PREFIX}/`,
      })
    );
    console.log("✅ S3 ListObjects OK. Example key:", list.Contents?.[0]?.Key || "(none)");
  } catch (e: any) {
    console.error("⚠️ S3 ListObjects failed (non-fatal):", e?.name, e?.$metadata?.httpStatusCode, e?.message);
  }

  // GCS
  const storage = new Storage();
  const gcsBucket = storage.bucket(GCS_BUCKET_NAME);

  // Allowed tickers
  const [allowedBuf] = await gcsBucket.file(GCS_ALLOWED_FILE).download();
  const allowedTickers: string[] = JSON.parse(allowedBuf.toString());
  const allowed = new Set(allowedTickers);
  console.log(`🪪 Allowed tickers: ${allowed.size}`);

  // Dates to process (skip today), oldest → newest
  const days: Array<ReturnType<typeof fmtUTC>> = [];
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  for (let i = 1; i <= BACKFILL_DAYS; i++) {
    const d = new Date(todayUTC);
    d.setUTCDate(d.getUTCDate() - i);
    days.push(fmtUTC(d));
  }
  days.reverse();
  console.log("🗓️ Will attempt dates:", days.map((d) => d.dateStr).join(", "));
  console.log(`🧵 Day concurrency: ${DAY_CONCURRENCY}`);

  // Per-day processor (runs in the pool)
  const processOneDay = async (day: ReturnType<typeof fmtUTC>) => {
    console.log(`\n====== 📅 ${day.dateStr} starting ======`);
      const dow = new Date(`${day.dateStr}T00:00:00Z`).getUTCDay(); // 0=Sun,6=Sat
      if (dow === 0 || dow === 6) {
      console.log(`🛌 Weekend ${day.dateStr} → skip without S3`);
      return;
      }
    // Batch existence check for date-based outputs
    const existingByDate = new Set<string>();
    try {
      const [files] = await gcsBucket.getFiles({
        // CHANGED: use minute/YYYY-MM-DD/ instead of flatfiles_by_date/...
        prefix: `${MINUTE_BY_DATE_PREFIX}/${day.dateStr}/`,
      });
      for (const f of files) {
        const name = f.name; // minute/YYYY-MM-DD/TICKER.csv
        const base = path.basename(name, ".csv");
        existingByDate.add(base); // add TICKER
      }
      console.log(`🧮 existingByDate(${day.dateStr}) = ${existingByDate.size}`);
    } catch (e: any) {
      console.log(`⚠️ Could not list existing by-date for ${day.dateStr}:`, e?.message || e);
    }

    // Build S3 key and decide wait window
    const key = `${S3_PREFIX}/${day.yyyy}/${day.mm}/${day.fileName}`;
    const yesterdayStr = fmtUTC(new Date(todayUTC.getTime() - 24 * 60 * 60 * 1000)).dateStr;
    const isYesterday = day.dateStr === yesterdayStr;
    const maxWaitMin = isYesterday ? YESTERDAY_WAIT_MIN : 0;

    console.log(`➡ s3://${S3_BUCKET}/${key}`);
    console.log(`⏱ wait-window: ${maxWaitMin}m (isYesterday=${isYesterday})`);

    // Fetch S3 object (retry soft-missing/non-ready)
    let response = await getS3ObjectWithRetry(s3, S3_BUCKET, key, maxWaitMin);
    if (!response || !response.Body) {
      console.log(`🟡 ${day.dateStr}: file not available → skip date`);
      return;
    }

    // Peek first bytes to verify gzip
    const rawStream = response.Body as Readable;
    const firstChunk: Buffer | null = await new Promise((resolve) => {
      let resolved = false;
      const onResolve = (buf: Buffer | null) => {
        if (resolved) return;
        resolved = true;
        cleanup();
        resolve(buf);
      };
      const onData = (chunk: any) => onResolve(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      const onEnd = () => onResolve(null);
      const onErr = () => onResolve(null);
      const cleanup = () => {
        rawStream.removeListener("data", onData);
        rawStream.removeListener("end", onEnd);
        rawStream.removeListener("error", onErr);
      };
      rawStream.once("data", onData);
      rawStream.once("end", onEnd);
      rawStream.once("error", onErr);
    });

    if (!firstChunk) {
      console.log(`🟡 ${day.dateStr}: empty stream → skip date`);
      return;
    }

    const isGzip = firstChunk.length >= 2 && firstChunk[0] === 0x1f && firstChunk[1] === 0x8b;
    console.log(`🔍 firstChunk gzip? ${isGzip}`);

    if (!isGzip) {
      if (isYesterday) {
        console.log(`⚠️ ${day.dateStr}: non-gzip (likely JSON/HTML). Quick 5m retry...`);
        response = await getS3ObjectWithRetry(s3, S3_BUCKET, key, 5);
        if (!response?.Body) {
          console.log(`🟡 ${day.dateStr}: still non-gzip/no body → skip date`);
          return;
        }
      } else {
        console.log(`🟡 ${day.dateStr}: non-gzip on older day → skip date`);
        return;
      }
    }

    // Rebuild a stream that includes the firstChunk, then gunzip
    const bodyStream = new Readable({ read() {} });
    bodyStream.push(firstChunk);
    const original = response.Body as Readable;
    original.on("data", (c) => bodyStream.push(c));
    original.on("end", () => bodyStream.push(null));
    original.on("error", (e) => bodyStream.destroy(e));

    const gunzip = zlib.createGunzip();
    let sawGunzipError = false;
    gunzip.once("error", (e) => {
      sawGunzipError = true;
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`⛔ gunzip error for ${key}: ${msg}`);
    });

    const decompressedStream = bodyStream.pipe(gunzip);
    const rl = readline.createInterface({ input: decompressedStream, crlfDelay: Infinity });

    // === One-open-writer-at-a-time plan (files are grouped by ticker then minute) ===
    let headers: string | undefined;
    let processed = 0;
    let matched = 0;
    let skippedAlreadyDoneByDate = 0;

    let currentTicker: string | null = null;
    let needTicker = false;
    let needDate = false;
    let wsTicker: fs.WriteStream | null = null;
    let wsDate: fs.WriteStream | null = null;
    let tmpTickerPath: string | undefined;
    let tmpDatePath: string | undefined;

    // small helper
    const safeUnlink = (p?: string) => {
      try { if (p && fs.existsSync(p)) fs.unlinkSync(p); } catch {}
    };

    // CHANGED: add customTime support + no-store
    const uploadWithPrecondition = async (
      localPath: string,
      destination: string,
      customTimeIso: string
    ) => {
      await gcsBucket.upload(localPath, {
        destination,
        contentType: "text/csv",
        metadata: {
          cacheControl: "no-store",
          customTime: customTimeIso,
        },
        preconditionOpts: { ifGenerationMatch: 0 }, // only create if it doesn't exist
      });
    };

    const closeAndUploadCurrent = async () => {
      if (!currentTicker) return;

      const closes: Promise<void>[] = [];
      if (wsTicker) {
        closes.push(new Promise<void>((res) => wsTicker!.end(() => res())));
      }
      if (wsDate) {
        closes.push(new Promise<void>((res) => wsDate!.end(() => res())));
      }
      await Promise.allSettled(closes);

      const subUploads: Promise<any>[] = [];
      const customTimeIso = `${day.dateStr}T00:00:00Z`;

      if (needTicker && tmpTickerPath) {
        // CHANGED: write to minute_by_ticker/TICKER/YYYY/YYYY-MM-DD.csv
        const destTicker = `${MINUTE_BY_TICKER_PREFIX}/${currentTicker}/${day.yyyy}/${day.dateStr}.csv`;
        subUploads.push(
          uploadWithPrecondition(tmpTickerPath, destTicker, customTimeIso)
            .catch((e: any) => {
              const code = e?.code || e?.statusCode || e?.status;
              if (code !== 412 && !String(e?.message || "").includes("Precondition Failed")) {
                console.error(`❌ Upload error (${destTicker}):`, e?.message || e);
              }
            })
            .finally(() => safeUnlink(tmpTickerPath))
        );
      }
      if (needDate && tmpDatePath) {
        // CHANGED: write to minute/YYYY-MM-DD/TICKER.csv
        const destDate = `${MINUTE_BY_DATE_PREFIX}/${day.dateStr}/${currentTicker}.csv`;
        subUploads.push(
          uploadWithPrecondition(tmpDatePath, destDate, customTimeIso)
            .catch((e: any) => {
              const code = e?.code || e?.statusCode || e?.status;
              if (code !== 412 && !String(e?.message || "").includes("Precondition Failed")) {
                console.error(`❌ Upload error (${destDate}):`, e?.message || e);
              }
            })
            .finally(() => safeUnlink(tmpDatePath))
        );
      }
      await Promise.allSettled(subUploads);

      // reset state
      currentTicker = null;
      needTicker = false;
      needDate = false;
      wsTicker = null;
      wsDate = null;
      tmpTickerPath = undefined;
      tmpDatePath = undefined;
    };

    for await (const line of rl) {
      if (!line) continue;

      if (!headers && line.startsWith("ticker")) {
        headers = line;
        continue;
      }

      processed++;
      const [ticker] = line.split(",", 1);
      if (!ticker) continue;
      if (!allowed.has(ticker)) continue;

      matched++;

      // If we moved to a new ticker, close & upload the previous one first
      if (currentTicker !== ticker) {
        await closeAndUploadCurrent();

        currentTicker = ticker;

        // Decide which outputs are needed
        //  - by-date: we pre-listed; skip if this ticker already present for that date
        needDate = !existingByDate.has(ticker);
        //  - by-ticker: we let GCS precondition (ifGenerationMatch=0) prevent overwrite
        needTicker = true;

        if (needTicker) {
          tmpTickerPath = path.join(os.tmpdir(), `${ticker}-${day.dateStr}.csv`);
          wsTicker = fs.createWriteStream(tmpTickerPath);
          wsTicker.write((headers ?? "ticker,ts,open,high,low,close,volume") + "\n");
        }
        if (needDate) {
          tmpDatePath = path.join(os.tmpdir(), `bydate-${ticker}-${day.dateStr}.csv`);
          wsDate = fs.createWriteStream(tmpDatePath);
          wsDate.write((headers ?? "ticker,ts,open,high,low,close,volume") + "\n");
        } else {
          skippedAlreadyDoneByDate++;
        }
      }

      // Write the current line to whichever outputs we’re producing
      if (wsTicker) wsTicker.write(line + "\n");
      if (wsDate) wsDate.write(line + "\n");
    }

    if (sawGunzipError) {
      console.log(`🟡 ${day.dateStr}: gunzip failed → skip date`);
      return;
    }

    // flush & upload the final ticker for this day
    await closeAndUploadCurrent();

    console.log(
      `📊 ${day.dateStr}: lines=${processed}, matched=${matched}, byDateAlready=${skippedAlreadyDoneByDate}`
    );
  };

  // Run days with a fixed-size pool
  await runWithConcurrency(days, DAY_CONCURRENCY, processOneDay);

  console.log("🎉 Backfill/upkeep pass complete.");
}

main().catch((err) => {
  console.error("🔥 Sync job failed:", err?.stack || err?.message || err);
  process.exit(1);
});
