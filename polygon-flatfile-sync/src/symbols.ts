/// <reference path="./types/parquetjs-lite.d.ts" />
import { Storage } from "@google-cloud/storage";
import * as fs from "fs";

const storage = new Storage();

/** Allowlist loader: env string, local file, or GCS (text or JSON). */
export async function loadAllowedTickers(): Promise<Set<string>> {
  const bucket = "set-up-nicely-flatfiles";
  const object = "allowed/allowedTickers.json";
  const [buf] = await storage.bucket(bucket).file(object).download();

  const txt = buf.toString("utf8");
  const j = JSON.parse(txt);
  const arr: string[] = Array.isArray(j) ? j : Array.isArray(j?.tickers) ? j.tickers : [];
  return new Set(arr.map(x => String(x).toUpperCase()).filter(Boolean));
}


function parseMaybeJson(s: string): Set<string> {
  const t = s.trim();
  if (t.startsWith("[") || t.startsWith("{")) {
    try {
      const j = JSON.parse(t);
      const arr = Array.isArray(j) ? j : Array.isArray(j?.tickers) ? j.tickers : [];
      return new Set(arr.map((x: string) => String(x).toUpperCase()).filter(Boolean));
    } catch { /* fall through */ }
  }
  return parseList(s);
}

function parseList(s: string): Set<string> {
  return new Set(
    s.split(/[,\s\r\n]+/)
      .map(x => x.trim().toUpperCase())
      .filter(Boolean)
  );
}

function parseGsUri(uri: string) {
  const p = uri.replace("gs://", "").split("/");
  return { bucket: p.shift()!, object: p.join("/") };
}

/** List "folder" prefixes (symbols) under a base prefix with pagination. */
async function listSymbolFolders(bucketName: string, basePrefix: string): Promise<string[]> {
  const bucket = storage.bucket(bucketName);
  const syms: string[] = [];
  let q: any = { prefix: `${basePrefix.replace(/\/?$/, "/")}`, delimiter: "/", autoPaginate: false };
  for (;;) {
    const [ , nextQ, resp ]: any = await bucket.getFiles(q);
    const prefixes: string[] = resp?.prefixes || [];
    for (const pref of prefixes) {
      const parts = pref.split("/").filter(Boolean);         // e.g. ["minute_by_ticker","AAPL"]
      const sym = parts[1];                                  // "AAPL"
      if (sym) syms.push(sym);
    }
    if (!nextQ) break;
    q = nextQ;
  }
  return syms;
}

/** Discover which symbols have at least one file for a given date.
 * Merges results from:
 *  - by-date:  <byDateBase>/<YYYY-MM-DD>/*.csv(.gz) → filenames parsed to symbols
 *  - by-ticker: <byTickerAlt>/<SYM>/<YYYY>/<YYYY-MM-DD>* → any filename starting with date
 */
export async function discoverSymbolsForDate(opts: {
  rawBucket: string;
  date: string;                         // YYYY-MM-DD
  byTickerAltBasePrefix?: string;       // e.g. "minute_by_ticker"
  byDateBasePrefix?: string;            // e.g. "minute"
  byTickerBasePrefix?: string;          // (legacy fallback "raw/1m")
  maxSymbols?: number;
}): Promise<string[]> {
  const { rawBucket, date, byTickerAltBasePrefix, byDateBasePrefix, byTickerBasePrefix, maxSymbols } = opts;
  const bucket = storage.bucket(rawBucket);
  const yyyy = date.slice(0, 4);
  const out = new Set<string>();

  // --- 1) by-date: minute/<date>/*.csv → quick win if you have this layout
  if (byDateBasePrefix) {
    const [files] = await bucket.getFiles({ prefix: `${byDateBasePrefix}/${date}/` });
    for (const f of files) {
      const base = f.name.split("/").pop() || "";
      const sym = base.split(/[_.-]/)[0].toUpperCase();      // e.g. AAPL_2024-08-06.csv → AAPL
      if (sym) {
        out.add(sym);
        if (maxSymbols && out.size >= maxSymbols) return Array.from(out).sort();
      }
    }
  }

  // --- 2) by-ticker: minute_by_ticker/<SYM>/<YYYY>/<YYYY-MM-DD>* → any suffixes/shards
  if (byTickerAltBasePrefix) {
    const syms = await listSymbolFolders(rawBucket, byTickerAltBasePrefix);
    const k = Math.max(1, Number(process.env.DISCOVERY_SYMBOL_CONCURRENCY || "32"));
    const logEvery = Math.max(1, Number(process.env.DISCOVERY_LOG_EVERY || "500"));
    let i = 0, scanned = 0, found = 0;

    async function hasAnyFor(sym: string) {
      const prefix = `${byTickerAltBasePrefix}/${sym}/${yyyy}/${date}`;
      const [files] = await bucket.getFiles({ prefix, maxResults: 1 });   // any match counts
      return files.length > 0;
    }

    async function worker() {
      for (;;) {
        const idx = i++; if (idx >= syms.length) return;
        const sym = syms[idx];
        try {
          if (await hasAnyFor(sym)) {
            out.add(sym);
            found++;
            if (maxSymbols && out.size >= maxSymbols) return;
          }
        } catch { /* ignore transient errors */ }
        scanned++;
        if (scanned % logEvery === 0) {
          console.log(`discover ${date}: scanned ${scanned}/${syms.length}, found=${found}`);
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(k, syms.length) }, worker));
    if (maxSymbols && out.size >= maxSymbols) return Array.from(out).sort();
  }

  // --- 3) fallback: raw/1m/symbol=<SYM>/dt=<date>/...
  if (out.size === 0 && byTickerBasePrefix) {
    // paginate symbol folders
    const base = `${byTickerBasePrefix.replace(/\/?$/, "/")}`;
    let q: any = { prefix: base, delimiter: "/", autoPaginate: false };
    for (;;) {
      const [ , nextQ, resp ]: any = await bucket.getFiles(q);
      const prefixes: string[] = resp?.prefixes || [];
      for (const pref of prefixes) {
        const m = pref.match(/symbol=([^/]+)\//);
        const sym = m?.[1];
        if (!sym) continue;
        const [files] = await bucket.getFiles({ prefix: `${byTickerBasePrefix}/symbol=${sym}/dt=${date}`, maxResults: 1 });
        if (files.length) {
          out.add(sym);
          if (maxSymbols && out.size >= maxSymbols) return Array.from(out).sort();
        }
      }
      if (!nextQ) break;
      q = nextQ;
    }
  }

  return Array.from(out).sort();
}
