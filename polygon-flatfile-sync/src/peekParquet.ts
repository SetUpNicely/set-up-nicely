/// <reference path="./types/parquetjs-lite.d.ts" />
import { Storage } from "@google-cloud/storage";
import { ParquetReader } from "parquetjs-lite";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

function parseGsUri(uri: string) {
  if (!uri.startsWith("gs://")) throw new Error("Pass a gs:// URI");
  const parts = uri.replace("gs://", "").split("/");
  const bucket = parts.shift()!;
  const object = parts.join("/");
  return { bucket, object };
}

async function main() {
  const gsUri = process.argv[2];
  const n = Number(process.argv[3] || 5);

  if (!gsUri) {
    console.error("Usage: ts-node src/peekParquet.ts gs://bucket/path/file.parquet [N]");
    process.exit(1);
  }

  const { bucket, object } = parseGsUri(gsUri);
  const tmp = path.join(os.tmpdir(), `peek_${Date.now()}.parquet`);

  // download to temp
  await new Storage().bucket(bucket).file(object).download({ destination: tmp });

  // open & read
  const reader = await ParquetReader.openFile(tmp);
  const cursor = reader.getCursor();

  const first: any[] = [];
  let total = 0;
  for (;;) {
    const row = await cursor.next();
    if (!row) break;
    total++;
    if (first.length < n) first.push(row);
  }

  await reader.close();
  fs.unlink(tmp, () => void 0);

  console.log(`\nFile: gs://${bucket}/${object}`);
  console.log(`Total rows: ${total}`);
  console.log(`First ${Math.min(n, total)} rows:`);
  console.table(first);
}

main().catch(e => { console.error(e); process.exit(1); });
