import { writeBuffer } from "./gcs";

export interface MonthManifest {
  tf: string;
  session: string;
  symbol: string;
  year: number;
  month: number;
  rowCount: number;
  minTs: number | string; // ensure no BigInt
  maxTs: number | string;
  sourceDailyFiles: Array<{ object: string; generation: string }>;
  createdAt: string; // ISO
  checksum: string;
}

// deterministic checksum of GCS object:gen pairs
export function checksumOf(files: Array<{ object: string; generation: string }>) {
  return files
    .map((f) => `${f.object}:${f.generation}`)
    .sort()
    .join("|")
    .split("")
    .reduce((a, c) => ((a * 33) ^ c.charCodeAt(0)) >>> 0, 5381)
    .toString(16);
}

// replacer to serialize BigInt as string
function bigintReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

export async function writeMonthManifest(bucket: string, object: string, mf: MonthManifest) {
  const buf = Buffer.from(JSON.stringify(mf, bigintReplacer, 2), "utf8");
  await writeBuffer(bucket, object, buf, "application/json");
}
