import { Storage } from "@google-cloud/storage";
import { ParquetReader, ParquetWriter } from "parquetjs-lite";
import { parquetSchemaForTF, CandleRow, TF, Session } from "./parquetSchema";
import { dailyMonthPrefix, monthlyOutPath, monthlyManifestPath, downloadToTmp } from "./gcs";
import { checksumOf, MonthManifest, writeMonthManifest } from "./manifest";
import * as fs from "fs";

const storage = new Storage();

/** Normalize any bigint fields so downstream math/sort/JSON is predictable. */
function normalizeRow(row: any): CandleRow {
  // timestamps (ms epoch) are safe to coerce to number
  if (typeof row.t === "bigint") row.t = Number(row.t);
  // volumes are typically well within 2^53; coerce to number for parity with your schema
  if (typeof row.v === "bigint") row.v = Number(row.v);
  // parquet libs sometimes surface DOUBLEs as strings in odd paths; be defensive:
  if (typeof row.o === "string") row.o = Number(row.o);
  if (typeof row.h === "string") row.h = Number(row.h);
  if (typeof row.l === "string") row.l = Number(row.l);
  if (typeof row.c === "string") row.c = Number(row.c);
  if (row.vw != null && typeof row.vw === "string") row.vw = Number(row.vw);
  return row as CandleRow;
}

export async function compactDailyToMonthly(opts: {
  bucket: string;
  tf: TF;
  session: Session;
  symbol: string;
  year: number;
  month: number;
  failOnMixed?: boolean;       // if true, throw on wrong-symbol rows
}): Promise<{ outPath: string; rowCount: number } | void> {
  const { bucket, tf, session, symbol, year, month, failOnMixed } = opts;
  const yyyyMm = `${year}-${String(month).padStart(2, "0")}`;

  const [files] = await storage
    .bucket(bucket)
    .getFiles({ prefix: dailyMonthPrefix(tf, session, symbol, yyyyMm) });

  const dailyParts = files
    .filter(f => /\/day=\d{4}-\d{2}-\d{2}\/part-000\.parquet$/.test(f.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (dailyParts.length === 0) {
    console.warn(`[monthly] no daily parts for ${symbol} ${tf} ${session} ${yyyyMm}`);
    return;
  }

  // Track source objects for manifest checksum
  const src: Array<{ object: string; generation: string }> = [];
  for (const f of dailyParts) {
    const [meta] = await f.getMetadata();
    src.push({ object: f.name, generation: String(meta.generation) });
  }
  const checksum = checksumOf(src);

  const outPath  = monthlyOutPath(tf, session, symbol, year, month);
  const maniPath = monthlyManifestPath(tf, session, symbol, year, month);

  const localOut = `/tmp/month-${tf}-${session}-${symbol}-${yyyyMm}.parquet`;
  const writer   = await ParquetWriter.openFile(parquetSchemaForTF(tf), localOut, { useDataPageV2: false });

  let rowCount = 0;
  let minTs = Number.POSITIVE_INFINITY;
  let maxTs = 0;

  for (const part of dailyParts) {
    const tmp = await downloadToTmp(bucket, part.name);
    const reader = await ParquetReader.openFile(tmp);
    const cursor = reader.getCursor();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let row: any;
    let badRows = 0;
    let firstChecked = false;

    while ((row = await cursor.next())) {
      const r = normalizeRow(row);

      // quick header consistency on first row
      if (!firstChecked) {
        if (r.symbol !== symbol || r.tf !== tf || r.session !== session) {
          await reader.close();
          try { fs.unlinkSync(tmp); } catch {}
          throw new Error(
            `Header mismatch in ${part.name}: got symbol=${r.symbol},tf=${r.tf},session=${r.session} expected symbol=${symbol},tf=${tf},session=${session}`
          );
        }
        firstChecked = true;
      }

      // filter wrong-symbol rows (defensive against any historical miswrites)
      if (r.symbol !== symbol) {
        badRows++;
        if (failOnMixed) {
          await reader.close();
          try { fs.unlinkSync(tmp); } catch {}
          throw new Error(`Mixed symbols in ${part.name}: found ${r.symbol}, expected ${symbol}`);
        }
        continue;
      }

      await writer.appendRow(r as unknown as Record<string, unknown>);
      rowCount++;
      if (r.t < minTs) minTs = r.t;
      if (r.t > maxTs) maxTs = r.t;
    }

    if (badRows) {
      console.warn(`[monthly] filtered ${badRows} wrong-symbol rows in ${part.name} (expected ${symbol})`);
    }

    await reader.close();
    try { fs.unlinkSync(tmp); } catch {}
  }

  await writer.close();

  // atomic publish: upload to tmp name, then copy to final, then delete tmp
  const tmpOut = outPath.replace(/part-00001\.parquet$/, `part-00001.tmp-${checksum}.parquet`);
  await storage.bucket(bucket).upload(localOut, {
    destination: tmpOut,
    contentType: "application/octet-stream",
    resumable: false,
  });
  await storage.bucket(bucket).file(tmpOut).copy(storage.bucket(bucket).file(outPath));
  await storage.bucket(bucket).file(tmpOut).delete({ ignoreNotFound: true });
  try { fs.unlinkSync(localOut); } catch {}

  // manifest (JSON serialization already uses your bigint-safe replacer)
  const mf: MonthManifest = {
    tf, session, symbol, year, month,
    rowCount,
    minTs,
    maxTs,
    sourceDailyFiles: src,
    createdAt: new Date().toISOString(),
    checksum,
  };
  await writeMonthManifest(bucket, maniPath, mf);

  console.log(`[monthly] ${symbol} ${tf} ${session} ${yyyyMm} → ${rowCount} rows → gs://${bucket}/${outPath}`);
  return { outPath, rowCount };
}
