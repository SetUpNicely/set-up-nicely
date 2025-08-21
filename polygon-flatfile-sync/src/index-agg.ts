// 📍 src/index-agg.ts
import { Storage } from "@google-cloud/storage";
import { aggregateOneTickerDayToParquet } from "./aggregateMinutesToParquet";

const storage = new Storage();

/** helpers */
const sleep = (ms:number) => new Promise(r=>setTimeout(r,ms));
const isWeekend = (iso:string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = d.getUTCDay(); // 0 Sun, 6 Sat
  return dow === 0 || dow === 6;
};
function listDates(backfillDays:number, startDate?:string): string[] {
  const out:string[] = [];
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  for (let i = 1; i <= backfillDays; i++) {
    const d = new Date(todayUTC);
    d.setUTCDate(d.getUTCDate() - i);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth()+1).padStart(2,"0");
    const dd = String(d.getUTCDate()).padStart(2,"0");
    const iso = `${yyyy}-${mm}-${dd}`;
    if (startDate && iso < startDate) continue;
    out.push(iso);
  }
  return out.reverse(); // oldest → newest
}

/** env */
const RAW_BUCKET         = process.env.RAW_BUCKET         || "set-up-nicely-flatfiles";
const OUT_BUCKET         = process.env.OUT_BUCKET         || "set-up-nicely-agg";
const BY_DATE_PREFIX     = process.env.BY_DATE_PREFIX     || "minute"; // minute/<date>/<symbol>.csv(.gz)
const BACKFILL_DAYS      = Math.max(1, Number(process.env.BACKFILL_DAYS || 7));
const START_DATE         = process.env.START_DATE; // optional YYYY-MM-DD (inclusive lower bound)
const SYMBOL_CONCURRENCY = Math.max(1, Math.min(64, Number(process.env.SYMBOL_CONCURRENCY || 12)));
const RETRY_SLEEP_MS     = Math.max(0, Number(process.env.RETRY_SLEEP_MS || 2000));
const SKIP_WEEKENDS      = (process.env.SKIP_WEEKENDS || "true") === "true";
const COMPUTE_VWAP       = (process.env.COMPUTE_VWAP || "false") === "true";
const VERBOSE            = (process.env.VERBOSE || "false") === "true";
const ONLY_SYMBOLS       = process.env.ONLY_SYMBOLS || "";   // e.g. "A,AA,AG"
const DATES              = process.env.DATES || "";          // e.g. "2025-08-13,2025-08-14"
// treat these as "already exists" (not errors)
const PRECOND_RE = /pre-?condition|pre-conditions|ifGenerationMatch|412/i;

function parseList(s:string): string[] {
  return s.split(/[,\s\r\n]+/).map(x=>x.trim().toUpperCase()).filter(Boolean);
}

/** multi-task config */
type Session = "RTH" | "EXTENDED";
type TF = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";
type Task = { session: Session; tfs: TF[] };

function parseTasks(): Task[] {
  // Format: TASKS="RTH:1d;EXTENDED:1d,1m,5m,15m,30m,1h,4h"
  const raw = (process.env.TASKS || "").trim();
  if (raw) {
    return raw.split(";").filter(Boolean).map(part => {
      const [sess, tfCsv] = part.split(":");
      const session = (sess?.trim().toUpperCase() as Session) || "RTH";
      const tfs = (tfCsv || "")
        .split(",")
        .map(s => s.trim())
        .filter(Boolean) as TF[];
      return { session, tfs };
    });
  }
  // Back-compat: fall back to SESSION + TF_LIST if TASKS not provided
  const sessionFallback = ((process.env.SESSION || "RTH").toUpperCase() as Session);
  const tfsFallback = ((process.env.TF_LIST || "1d").split(",").map(s=>s.trim()) as TF[]);
  return [{ session: sessionFallback, tfs: tfsFallback }];
}
const TASKS: Task[] = parseTasks();

/** worker pool over symbols for a single (date, task) */
async function runForDate(date: string, symbols: string[], task: Task) {
  if (SKIP_WEEKENDS && isWeekend(date)) {
    if (VERBOSE) console.log(`🛌 Weekend ${date} → skip`);
    return;
  }
  if (!symbols.length) {
    if (VERBOSE) console.log(`(no symbols) ${date} session=${task.session}`);
    return;
  }
  if (VERBOSE) {
    console.log(`\n====== 📅 ${date} session=${task.session} tfs=${task.tfs.join(",")} (n=${symbols.length}) ======`);
  }

  let i = 0;
  let ok = 0;
  let precondSkips = 0;
  let hardErrors = 0;

  const workers = Array.from({ length: SYMBOL_CONCURRENCY }).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= symbols.length) break;
      const symbol = symbols[idx];
      try {
        await aggregateOneTickerDayToParquet({
          rawBucket: RAW_BUCKET,
          outBucket: OUT_BUCKET,
          symbol, date,
          session: task.session,
          tfs: task.tfs as any,
          computeVWAP: COMPUTE_VWAP,
          // 🔒 exact by-date files only (prevents wildcard cross-matches)
          byDateBasePrefix: BY_DATE_PREFIX,
          // no byTicker fallbacks on purpose
          // byTickerAltBasePrefix: undefined,
          // byTickerBasePrefix: undefined,
          // quiet QC in daily runs
          logQC: false,
        });
        ok++;
      } catch (e: any) {
        const msg = e?.message || String(e);
        if (PRECOND_RE.test(msg)) {
          precondSkips++;
          if (VERBOSE) console.debug(`↩️ exists, skip ${symbol} ${date} ${task.session}`);
          // don't delay/retry on an already-exists skip
          continue;
        }
        hardErrors++;
        console.warn(`⚠️ ${symbol} ${date} ${task.session}: ${msg}`);
        await sleep(RETRY_SLEEP_MS);
      }
    }
  });

  await Promise.all(workers);

  console.log(
    `✔️ ${date} session=${task.session} tfs=[${task.tfs.join(",")}] ` +
    `ok=${ok}, exists=${precondSkips}, errors=${hardErrors}`
  );
}


async function main() {
  // load allowed tickers
  const [buf] = await storage.bucket(RAW_BUCKET).file("allowed/allowedTickers.json").download();
  const allowed:string[] = JSON.parse(buf.toString());
  console.log(`🪪 allowed=${allowed.length}`);

  let symbols = allowed.map(s => String(s).toUpperCase());
  if (ONLY_SYMBOLS.trim()) {
    const want = new Set(parseList(ONLY_SYMBOLS));
    symbols = symbols.filter(s => want.has(s));
    console.log(`🎯 Restricting to ${symbols.length} tickers via ONLY_SYMBOLS`);
  }

  const dates = DATES.trim()
    ? parseList(DATES)                           // explicit list
    : listDates(BACKFILL_DAYS, START_DATE);      // window

  console.log(`📆 Range/Set: ${dates[0]} → ${dates[dates.length-1]} (n=${dates.length}), BACKFILL_DAYS=${BACKFILL_DAYS}, START_DATE=${START_DATE ?? "(none)"}`);
  console.log(`🧩 Tasks: ${TASKS.map(t => `${t.session}:${t.tfs.join(",")}`).join(" ; ")}`);
  console.log(`🧵 SYMBOL_CONCURRENCY=${SYMBOL_CONCURRENCY}`);

  for (const d of dates) {
    for (const task of TASKS) {
      await runForDate(d, symbols, task);
    }
  }

  console.log("🎉 aggregate job complete.");
}

main().catch(e => {
  console.error("💥 aggregate job failed:", e?.stack || e);
  process.exit(1);
});
