import { Storage } from "@google-cloud/storage";
import { DateTime } from "luxon";
import * as path from "path";

const storage = new Storage();

/** INPUT (daily) paths — matches your writer */
export function dailyDayPath(tf: string, session: string, symbol: string, isoDay: string) {
  const yyyyMm = isoDay.slice(0, 7);
  return `agg/${tf}/session=${session}/symbol=${symbol}/month=${yyyyMm}/day=${isoDay}/part-000.parquet`;
}
export function dailyMonthPrefix(tf: string, session: string, symbol: string, yyyyMm: string) {
  return `agg/${tf}/session=${session}/symbol=${symbol}/month=${yyyyMm}/day=`;
}

/** OUTPUT (monthly/yearly/tails) */
export function monthlyOutPath(tf: string, session: string, symbol: string, year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  return `agg-monthly/${tf}/session=${session}/symbol=${symbol}/year=${year}/month=${mm}/part-00001.parquet`;
}
export function monthlyManifestPath(tf: string, session: string, symbol: string, year: number, month: number) {
  const mm = String(month).padStart(2, "0");
  return `manifests/monthly/${year}-${mm}/${tf}/session=${session}/${symbol}.json`;
}
export function yearlyOutPath(tf: string, session: string, symbol: string, year: number) {
  return `agg-yearly/${tf}/session=${session}/symbol=${symbol}/year=${year}/part-00001.parquet`;
}
export function tailOutPath(tf: string, session: string, symbol: string, lastN: number) {
  return `tail/${tf}/session=${session}/symbol=${symbol}/lastN=${lastN}.parquet`;
}

/** GCS helpers */
export async function fileExists(bucket: string, object: string) {
  const [exists] = await storage.bucket(bucket).file(object).exists();
  return !!exists;
}
export async function readJsonGCS<T=any>(gsUri: string): Promise<T> {
  const m = gsUri.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (!m) throw new Error(`Invalid GCS URI: ${gsUri}`);
  const [, b, p] = m;
  const [buf] = await storage.bucket(b).file(p).download();
  return JSON.parse(buf.toString("utf8"));
}
export async function writeBuffer(bucket: string, object: string, buf: Buffer, contentType="application/octet-stream") {
  await storage.bucket(bucket).file(object).save(buf, { contentType, resumable: true });
}
export async function downloadToTmp(bucket: string, object: string) {
  const tmp = path.join("/tmp", object.replace(/\//g, "_"));
  await storage.bucket(bucket).file(object).download({ destination: tmp });
  return tmp;
}
// monthsBetween.ts (or in gcs.ts)
export function monthsBetween(startISO: string, endISO: string): Array<{year:number; month:number}> {
  // Interpret as UTC dates and normalize to the 1st of the month.
  const s = new Date(startISO + "T00:00:00Z");
  const e = new Date(endISO   + "T00:00:00Z");      // end is exclusive

  // Normalize both to the first day of their months
  const cur = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1));
  const end = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 1));

  const out: Array<{year:number; month:number}> = [];
  while (cur < end) {
    out.push({ year: cur.getUTCFullYear(), month: cur.getUTCMonth() + 1 }); // 1-based month
    // advance to next month (safe across year boundaries)
    cur.setUTCMonth(cur.getUTCMonth() + 1, 1);
    cur.setUTCHours(0, 0, 0, 0);
  }
  return out;
}

export async function listSymbolsFromAllowed(allowedGsUri: string): Promise<string[]> {
  const arr = await readJsonGCS<any>(allowedGsUri);
  return Array.isArray(arr) ? arr.map((s:any)=>String(s).toUpperCase()) : (arr.symbols ?? []);
}
