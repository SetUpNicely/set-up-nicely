// 📍 src/loader.ts
import { Storage, File } from "@google-cloud/storage";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { ParquetReader } from "parquetjs-lite"; // ensure your shims include Reader

type Session = "RTH" | "EXTENDED";
type TF = "5m" | "15m" | "30m" | "1h" | "4h" | "1d" | "1w";

export type Bar = {
  t: number; // ms UTC
  o: number; h: number; l: number; c: number; v: number;
  vw?: number;
  symbol: string;
  tf?: string;
  session?: string;
};

const storage = new Storage();

/** List parquet shards for a timeframe/session/symbol. */
async function listAllShards(
  bucket: string,
  tf: TF,
  session: Session,
  symbol: string
): Promise<File[]> {
  const prefix = `agg/${tf}/session=${session}/symbol=${symbol}/`;
  const [files] = await storage.bucket(bucket).getFiles({ prefix });
  if (tf === "1w") {
    // year-based weekly files: .../year=YYYY/part-YYYY-Www.parquet
    return files.filter(f => /\/year=\d{4}\/part-/.test(f.name));
  }
  // day-based files for everything else
  return files.filter(f => /\/day=\d{4}-\d{2}-\d{2}\/part-/.test(f.name));
}

/** Extract YYYY-MM-DD from a day shard path. */
function extractDay(f: File): string | null {
  const m = f.name.match(/\/day=(\d{4}-\d{2}-\d{2})\//);
  return m ? m[1] : null;
}

/** Extract {year, week} from a weekly file name: part-YYYY-Www.parquet */
function extractYearWeek(f: File): { year: number; week: number } | null {
  const m = f.name.match(/part-(\d{4})-W(\d{2})\.parquet$/);
  if (!m) return null;
  return { year: Number(m[1]), week: Number(m[2]) };
}

/** newest→oldest by day */
function byDayDesc(a: File, b: File): number {
  const da = extractDay(a) ?? "1970-01-01";
  const db = extractDay(b) ?? "1970-01-01";
  return db.localeCompare(da);
}

/** oldest→newest by day */
function byDayAsc(a: File, b: File): number {
  const da = extractDay(a) ?? "1970-01-01";
  const db = extractDay(b) ?? "1970-01-01";
  return da.localeCompare(db);
}

/** newest→oldest by year/week */
function byYearWeekDesc(a: File, b: File): number {
  const A = extractYearWeek(a) ?? { year: 1970, week: 1 };
  const B = extractYearWeek(b) ?? { year: 1970, week: 1 };
  if (A.year !== B.year) return B.year - A.year;
  return B.week - A.week;
}

/** oldest→newest by year/week */
function byYearWeekAsc(a: File, b: File): number {
  const A = extractYearWeek(a) ?? { year: 1970, week: 1 };
  const B = extractYearWeek(b) ?? { year: 1970, week: 1 };
  if (A.year !== B.year) return A.year - B.year;
  return A.week - B.week;
}

/** Download a GCS object to a temp file and return the local path. */
async function downloadToTmp(f: File): Promise<string> {
  const base = path.basename(f.name).replace(/\//g, "_");
  const tmp = path.join(os.tmpdir(), `parq_${Date.now()}_${Math.random().toString(36).slice(2)}_${base}`);
  await f.download({ destination: tmp });
  return tmp;
}

/** Read ALL rows from a parquet file on disk. Caller deletes the temp file. */
async function readParquetRows(localPath: string): Promise<Bar[]> {
  // @ts-ignore shimmed types
  const reader = await ParquetReader.openFile(localPath);
  const cursor = reader.getCursor();
  const rows: Bar[] = [];
  for (;;) {
    const rec = await cursor.next();
    if (!rec) break;
    rows.push(rec as Bar);
  }
  await reader.close();
  return rows;
}

/** Deduplicate by timestamp (keep last) and sort ascending by t. */
function normalizeBars(bars: Bar[]): Bar[] {
  const map = new Map<number, Bar>();
  for (const b of bars) map.set(b.t, b);
  return Array.from(map.values()).sort((a, b) => a.t - b.t);
}

/** Most recent N bars — great for seeding CandleStore. */
export async function loadLastNBars(args: {
  bucket: string;
  tf: TF;
  session: Session;
  symbol: string;
  n: number;
  preferRTHFallbackEXT?: boolean; // true: if primary session has zero bars, try the other
}): Promise<Bar[]> {
  const { bucket, tf, session, symbol, n, preferRTHFallbackEXT = true } = args;

  const loadCore = async (sess: Session): Promise<Bar[]> => {
    let shards = await listAllShards(bucket, tf, sess, symbol);
    // Sort appropriately
    shards = tf === "1w" ? shards.sort(byYearWeekDesc) : shards.sort(byDayDesc);

    const out: Bar[] = [];
    for (const f of shards) {
      const tmp = await downloadToTmp(f);
      try {
        const rows = await readParquetRows(tmp);
        out.push(...rows);
        // Early stop for everything EXCEPT weekly (weekly files are tiny anyway)
        if (tf !== "1w" && out.length >= n) break;
      } finally {
        fs.unlink(tmp, () => void 0);
      }
    }
    return normalizeBars(out).slice(-n);
  };

  const primary = await loadCore(session);
  if (primary.length > 0 || !preferRTHFallbackEXT) return primary;

  const fallback: Session = session === "RTH" ? "EXTENDED" : "RTH";
  return loadCore(fallback);
}

/** Bars in [startMs, endMs) — for backtests. */
export async function loadRange(args: {
  bucket: string;
  tf: TF;
  session: Session;
  symbol: string;
  startMs: number;
  endMs: number; // exclusive
}): Promise<Bar[]> {
  const { bucket, tf, session, symbol, startMs, endMs } = args;

  let shards = await listAllShards(bucket, tf, session, symbol);

  if (tf === "1w") {
    // Optional coarse prune by year to avoid reading unrelated years
    const startYear = new Date(startMs).getUTCFullYear();
    const endYear = new Date(endMs).getUTCFullYear();
    const keep = new Set<number>();
    for (let y = startYear; y <= endYear; y++) keep.add(y);
    shards = shards.filter(f => {
      const m = f.name.match(/\/year=(\d{4})\//);
      return m ? keep.has(Number(m[1])) : true;
    }).sort(byYearWeekAsc);
  } else {
    // Day-based coarse prune
    shards = shards
      .filter(f => {
        const day = extractDay(f);
        if (!day) return false;
        const dayStart = Date.parse(`${day}T00:00:00Z`);
        const dayEnd = dayStart + 24 * 3600 * 1000;
        return dayEnd > startMs && dayStart < endMs;
      })
      .sort(byDayAsc);
  }

  const out: Bar[] = [];
  for (const f of shards) {
    const tmp = await downloadToTmp(f);
    try {
      const rows = await readParquetRows(tmp);
      for (const r of rows) {
        if (r.t >= startMs && r.t < endMs) out.push(r);
      }
    } finally {
      fs.unlink(tmp, () => void 0);
    }
  }
  return normalizeBars(out);
}

/** Convenience: prefer RTH for 1d/1w; fallback to EXTENDED if empty. */
export async function loadRangePreferRTH(args: {
  bucket: string;
  tf: "1d" | "1w";
  symbol: string;
  startMs: number;
  endMs: number;
}): Promise<Bar[]> {
  const rth = await loadRange({ ...args, session: "RTH" });
  return rth.length ? rth : loadRange({ ...args, session: "EXTENDED" });
}

