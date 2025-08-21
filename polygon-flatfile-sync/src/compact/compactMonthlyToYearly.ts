import { Storage } from "@google-cloud/storage";
import { ParquetReader, ParquetWriter } from "parquetjs-lite";
import { yearlyOutPath } from "./gcs";
import { parquetSchemaForTF, TF, Session } from "./parquetSchema";
import * as fs from "fs";
import * as path from "path";

const storage = new Storage();

export async function compactMonthlyToYearly(opts: {
  bucket: string;
  tf: TF;
  session: Session;
  symbol: string;
  year: number;
}): Promise<{ outPath: string; rowCount: number } | void> {
  const { bucket, tf, session, symbol, year } = opts;

  const monthlyObjects: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, "0");
    const obj = `agg-monthly/${tf}/session=${session}/symbol=${symbol}/year=${year}/month=${mm}/part-00001.parquet`;
    const [exists] = await storage.bucket(bucket).file(obj).exists();
    if (exists) monthlyObjects.push(obj);
  }
  if (!monthlyObjects.length) return;

  const local = `/tmp/year-${tf}-${session}-${symbol}-${year}.parquet`;
  const writer = await ParquetWriter.openFile(parquetSchemaForTF(tf), local, { useDataPageV2: false });

  let rowCount = 0;
  for (const obj of monthlyObjects) {
    const tmp = path.join("/tmp", obj.replace(/\//g, "_"));
    await storage.bucket(bucket).file(obj).download({ destination: tmp });
    const reader = await ParquetReader.openFile(tmp);
    const cursor = reader.getCursor();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let row: any;
    while ((row = await cursor.next())) {
      await writer.appendRow(row as unknown as Record<string, unknown>);
      rowCount++;
    }
    await reader.close();
    try { fs.unlinkSync(tmp); } catch {}
  }

  await writer.close();
  const outPath = yearlyOutPath(tf, session, symbol, year);
  await storage.bucket(bucket).upload(local, { destination: outPath, contentType: "application/octet-stream", resumable: false });
  try { fs.unlinkSync(local); } catch {}

  console.log(`[yearly] ${symbol} ${tf} ${session} ${year} → ${rowCount} rows → gs://${bucket}/${outPath}`);
  return { outPath, rowCount };
}
