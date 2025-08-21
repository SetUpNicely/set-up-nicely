import { discoverSymbolsForDate } from "./symbols";

(async () => {
  const syms = await discoverSymbolsForDate({
    rawBucket: process.env.RAW_BUCKET!,
    date: process.env.DATE || "2024-08-06",
    byTickerAltBasePrefix: process.env.BY_TICKER_ALT || "minute_by_ticker",
    byDateBasePrefix: process.env.BY_DATE_BASE || undefined,
    byTickerBasePrefix: process.env.BY_TICKER_BASE || undefined,
    maxSymbols: process.env.MAX_SYMBOLS ? Number(process.env.MAX_SYMBOLS) : undefined,
  });
  console.log(`${syms.length} symbols`, syms.slice(0, 30));
})();
