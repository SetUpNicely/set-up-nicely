import { Storage } from "@google-cloud/storage";
import { ParquetReader, ParquetWriter } from "parquetjs-lite";
import { CandleRow, TF, Session, parquetSchemaForTF } from "./parquetSchema";
import { dailyDayPath, tailOutPath } from "./gcs";
import { DateTime } from "luxon";
import * as path from "path";

const storage = new Storage();

/** Normalize any bigint fields so downstream math/sort/parquet writes are predictable. */
function normalizeRow(row: any): CandleRow {
  if (typeof row.t === "bigint") row.t = Number(row.t);
  if (typeof row.v === "bigint") row.v = Number(row.v);
  if (typeof row.o === "string") row.o = Number(row.o);
  if (typeof row.h === "string") row.h = Number(row.h);
  if (typeof row.l === "string") row.l = Number(row.l);
  if (typeof row.c === "string") row.c = Number(row.c);
  if (row.vw != null && typeof row.vw === "string") row.vw = Number(row.vw);
  return row as CandleRow;
}

async function readDayFiltered(
  bucket: string,
  object: string,
  expect: { symbol: string; tf: TF; session: Session }
): Promise<CandleRow[]> {
  const tmp = path.join("/tmp", object.replace(/\//g, "_"));
  await storage.bucket(bucket).file(object).download({ destination: tmp });
  const reader = await ParquetReader.openFile(tmp);
  const cursor = reader.getCursor();

  const rows: CandleRow[] = [];
  let firstChecked = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let row: any;
  while ((row = await cursor.next())) {
    const r = normalizeRow(row);
    if (!firstChecked) {
      if (r.symbol !== expect.symbol || r.tf !== expect.tf || r.session !== expect.session) {
        await reader.close();
        throw new Error(
          `Header mismatch in ${object}: got symbol=${r.symbol},tf=${r.tf},session=${r.session} expected symbol=${expect.symbol},tf=${expect.tf},session=${expect.session}`
        );
      }
      firstChecked = true;
    }
    if (r.symbol === expect.symbol) rows.push(r);
  }
  await reader.close();
  return rows;
}

export async function buildTailSnapshot(opts: {
  bucket: string;
  tf: TF;
  session: Session;
  symbol: string;
  lastN?: number;
  includeDaily?: boolean;
}): Promise<void> {
  const { bucket, tf, session, symbol } = opts;
  const lastN = opts.lastN ?? 300;
  if (tf === "1d" && !opts.includeDaily) return;

  const rows: CandleRow[] = [];
  let d = DateTime.now().setZone("America/New_York").startOf("day");
  // up to ~80 market days backstop; stops early when lastN is satisfied
  for (let i = 0; i < 80 && rows.length < lastN; i++) {
    const iso = d.toFormat("yyyy-MM-dd");
    const object = dailyDayPath(tf, session, symbol, iso);
    const [exists] = await storage.bucket(bucket).file(object).exists();
    if (exists) {
      const dayRows = await readDayFiltered(bucket, object, { symbol, tf, session });
      if (dayRows.length) rows.push(...dayRows);
      if (rows.length >= lastN) break;
    }
    d = d.minus({ days: 1 });
  }

  const tail = rows.sort((a, b) => a.t - b.t).slice(-lastN);
  if (!tail.length) {
    console.warn(`[tail] no rows for ${symbol} ${tf} ${session}`);
    return;
  }

  const local = `/tmp/tail-${tf}-${session}-${symbol}-${lastN}.parquet`;
  const writer = await ParquetWriter.openFile(parquetSchemaForTF(tf), local, { useDataPageV2: false });
  for (const r of tail) {
    await writer.appendRow(r as unknown as Record<string, unknown>);
  }
  await writer.close();

  const out = tailOutPath(tf, session, symbol, lastN);
  await storage.bucket(bucket).upload(local, {
    destination: out,
    contentType: "application/octet-stream",
    resumable: false,
  });
  console.log(`[tail] ${symbol} ${tf} ${session} → ${tail.length} rows → gs://${bucket}/${out}`);
}

export async function buildAllTailSnapshots(opts: {
  bucket: string;
  symbols: string[];
  tfs?: TF[];
  sessions?: Session[];
  lastN?: number;
  includeDaily?: boolean;
}): Promise<void> {
  const tfs = opts.tfs ?? ["1m", "5m", "15m", "30m", "1h", "4h"];
  const sessions = opts.sessions ?? ["RTH", "EXTENDED"];
  for (const symbol of opts.symbols) {
    for (const session of sessions) {
      for (const tf of tfs) {
        try {
          await buildTailSnapshot({
            bucket: opts.bucket,
            tf,
            session,
            symbol,
            lastN: opts.lastN ?? 300,
            includeDaily: opts.includeDaily,
          });
        } catch (e) {
          console.error(`[tail] fail ${symbol} ${tf} ${session}:`, (e as Error).message);
        }
      }
    }
  }
}
