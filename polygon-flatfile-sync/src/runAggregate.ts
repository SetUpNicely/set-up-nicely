// 📍 src/runAggregate.ts
import { aggregateOneTickerDayToParquet } from "./aggregateMinutesToParquet";

async function runOne(symbol: string, date: string) {
  const rawBucket = process.env.RAW_BUCKET!;
  const outBucket = process.env.OUT_BUCKET!;

  // IMPORTANT: use ?? so empty env DOESN'T fall back to defaults
  const byDateBasePrefix      = process.env.BY_DATE_BASE ?? undefined;
  const byTickerBasePrefix    = process.env.BY_TICKER_BASE ?? undefined;
  const byTickerAltBasePrefix = process.env.BY_TICKER_ALT ?? undefined;

  // 1) Intraday EXTENDED (5m/15m/30m/1h/4h)
  await aggregateOneTickerDayToParquet({
    rawBucket,
    symbol,
    date,
    outBucket,
    session: "EXTENDED",
    tfs: ["1m","5m","15m","30m","1h","4h"], // 4h EXTENDED = 04–08, 08–12, 12–16, 16–20
    computeVWAP: true,
    dropPartialFinalBucket: false,          // EXTENDED: keep last bucket
    minutesAreUTC: true,
    byDateBasePrefix,
    byTickerBasePrefix,
    byTickerAltBasePrefix,
    logQC: true,
  });

  // 2) Daily RTH (1 bar @ session close ~16:00 ET)
  await aggregateOneTickerDayToParquet({
    rawBucket,
    symbol,
    date,
    outBucket,
    session: "RTH",
    tfs: ["1d"],
    dayBarTimestampMode: "SESSION_CLOSE",
    minutesAreUTC: true,
    byDateBasePrefix,
    byTickerBasePrefix,
    byTickerAltBasePrefix,
    logQC: true,
  });

  // 3) Daily EXTENDED (fallback; close ~20:00 ET)
  await aggregateOneTickerDayToParquet({
    rawBucket,
    symbol,
    date,
    outBucket,
    session: "EXTENDED",
    tfs: ["1d"],
    dayBarTimestampMode: "SESSION_CLOSE",
    minutesAreUTC: true,
    byDateBasePrefix,
    byTickerBasePrefix,
    byTickerAltBasePrefix,
    logQC: true,
  });
}

async function main() {
  const date = process.env.DATE || "2024-08-06";
  const symbols =
    (process.env.SYMBOLS?.split(",").map(s => s.trim()).filter(Boolean)) ||
    [process.env.SYMBOL || "AAPL"];

  for (const sym of symbols) {
    console.log(`\n=== ${sym} ${date} ===`);
    await runOne(sym, date);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
