import { DateTime } from "luxon";
import { aggregateOneTickerDayToParquet } from "./aggregateMinutesToParquet";
import { loadAllowedTickers, discoverSymbolsForDate } from "./symbols";

type TF = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1d";

function isWeekend(dateISO: string): boolean {
  const d = DateTime.fromISO(dateISO, { zone: "America/New_York" });
  return d.weekday === 6 || d.weekday === 7; // Sat/Sun
}

// optional: quick-n-dirty US market holiday list (extend as needed)
const HOLIDAYS = new Set<string>([
  "2024-09-02", "2024-11-28", "2024-12-25",
  "2025-01-01", "2025-01-20", "2025-02-17",
  "2025-04-18", "2025-05-26", "2025-06-19", "2025-07-04",
]);

function isHoliday(dateISO: string): boolean {
  return HOLIDAYS.has(dateISO);
}

const RAW_BUCKET  = must("RAW_BUCKET");
const OUT_BUCKET  = must("OUT_BUCKET");
const START_DATE  = process.env.START_DATE || DateTime.now().minus({ years: 1 }).toFormat("yyyy-LL-dd");
const END_DATE    = process.env.END_DATE   || DateTime.now().toFormat("yyyy-LL-dd");

// You primarily use minute_by_ticker; keep others undefined unless present
const BY_DATE_BASE       = envUndef("BY_DATE_BASE");
const BY_TICKER_BASE     = envUndef("BY_TICKER_BASE");
const BY_TICKER_ALT_BASE = process.env.BY_TICKER_ALT || "minute_by_ticker";

const CONCURRENCY       = Number(process.env.CONCURRENCY || "3");
const COMPUTE_VWAP      = process.env.COMPUTE_VWAP !== "false";     // default true
const DO_EXT_INTRADAY   = process.env.DO_EXT_INTRADAY !== "false";  // default true
const DO_1D_RTH         = process.env.DO_1D_RTH !== "false";        // default true
const DO_1D_EXT         = process.env.DO_1D_EXT !== "false";        // default true

// Include 1m if you want 1-minute Parquet shards for faster backtests
const INTRADAY_TFS: TF[] = (process.env.INTRADAY_TFS || "1m,5m,15m,30m,1h,4h")
  .split(",").map(t => t.trim() as TF);

function must(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`Set ${k}`);
  return v;
}
function envUndef(k: string): string | undefined {
  const v = process.env[k];
  return v === undefined || v === "" ? undefined : v;
}

function* dateIter(startISO: string, endISO: string) {
  let d = DateTime.fromISO(startISO, { zone: "America/New_York" }).startOf("day");
  const end = DateTime.fromISO(endISO,   { zone: "America/New_York" }).startOf("day");
  while (d <= end) {
    yield d.toFormat("yyyy-LL-dd");
    d = d.plus({ days: 1 });
  }
}

async function runOne(symbol: string, date: string) {
  if (DO_EXT_INTRADAY) {
    await aggregateOneTickerDayToParquet({
      rawBucket: RAW_BUCKET,
      symbol, date,
      outBucket: OUT_BUCKET,
      session: "EXTENDED",
      tfs: INTRADAY_TFS,
      computeVWAP: COMPUTE_VWAP,
      dropPartialFinalBucket: false,  // keep last bucket for EXTENDED
      minutesAreUTC: true,
      byDateBasePrefix:       BY_DATE_BASE,
      byTickerBasePrefix:     BY_TICKER_BASE,
      byTickerAltBasePrefix:  BY_TICKER_ALT_BASE,
      logQC: true,
    });
  }

  if (DO_1D_RTH) {
    await aggregateOneTickerDayToParquet({
      rawBucket: RAW_BUCKET,
      symbol, date,
      outBucket: OUT_BUCKET,
      session: "RTH",
      tfs: ["1d"],
      dayBarTimestampMode: "SESSION_CLOSE",
      minutesAreUTC: true,
      byDateBasePrefix:       BY_DATE_BASE,
      byTickerBasePrefix:     BY_TICKER_BASE,
      byTickerAltBasePrefix:  BY_TICKER_ALT_BASE,
      logQC: true,
    });
  }

  if (DO_1D_EXT) {
    await aggregateOneTickerDayToParquet({
      rawBucket: RAW_BUCKET,
      symbol, date,
      outBucket: OUT_BUCKET,
      session: "EXTENDED",
      tfs: ["1d"],
      dayBarTimestampMode: "SESSION_CLOSE", // 20:00 ET
      minutesAreUTC: true,
      byDateBasePrefix:       BY_DATE_BASE,
      byTickerBasePrefix:     BY_TICKER_BASE,
      byTickerAltBasePrefix:  BY_TICKER_ALT_BASE,
      logQC: true,
    });
  }
}

async function main() {
  const allow = await loadAllowedTickers(); // may be null
  console.log(`Backfill ${START_DATE} → ${END_DATE} with ${allow ? `${allow.size} allowed` : "auto-discovered"} symbols/day (CONCURRENCY=${CONCURRENCY})`);

  const dates = Array.from(dateIter(START_DATE, END_DATE));
  const jobs: Array<() => Promise<void>> = [];

  for (const d of dates) {
    if (isWeekend(d) || isHoliday(d)) {
      console.log(`⏭️  Skip market-closed day ${d}`);
      continue;
    }

    jobs.push(async () => {
      let syms: string[] = [];
      if (allow) {
        syms = Array.from(allow);
      } else {
        syms = await discoverSymbolsForDate({
          rawBucket: RAW_BUCKET,
          date: d,
          byTickerAltBasePrefix: BY_TICKER_ALT_BASE,
          byDateBasePrefix: BY_DATE_BASE,
          byTickerBasePrefix: BY_TICKER_BASE,
        });
      }

      if (!syms.length) {
        console.log(`⏭️  ${d}: no symbols found (nothing to do)`);
        return;
      }

      for (const sym of syms) {
        try {
          await runOne(sym, d);
        } catch (e: any) {
          console.error(`❌ ${sym} ${d}:`, e?.message || e);
        }
      }
    });
  }

  // date-level concurrency pool
  let i = 0;
  async function worker() {
    while (true) {
      const job = jobs[i++];
      if (!job) return;
      await job();
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));

  console.log("✅ Backfill done.");
}

main().catch(e => { console.error(e); process.exit(1); });
