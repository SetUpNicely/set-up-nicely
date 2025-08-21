// 📁 /firebase/functions/src/fetchCandlesForScan.ts

import { CandleData } from '../../../shared/data/CandleData.js';
import { aggregateCandles } from './utils/aggregatedCandles.js';
import { Timeframe } from '../../../shared/data/Timeframe.js';
import { getNextValidCandleTime, getPrevValidCandleTime } from './utils/getNearestValidCandleTime.js';
import { fetchCandlesFromPolygon } from './utils/fetchCandlesFromPolygon.js';

function getDefaultLookbackMinutes(timeframe: Timeframe): number {
  switch (timeframe) {
    case '1m': return 60 * 5;
    case '5m': return 60 * 24 * 2;
    case '15m': return 60 * 24 * 5;
    case '30m': return 60 * 24 * 10;
    case '1h': return 60 * 24 * 20;
    case '4h': return 60 * 24 * 60;
    case 'D': return 60 * 24 * 90;
    case 'W': return 60 * 24 * 365;
    default: return 60 * 24;
  }
}

export async function fetchCandlesForScan(
  symbol: string,
  timeframeFilter?: Timeframe,
  maxLookbackMinutes?: number,
  apiKey?: string,
  fixedFromMs?: number,
  fixedToMs?: number
): Promise<Partial<Record<Timeframe, CandleData[]>>> {
  if (!apiKey) throw new Error('❌ Polygon API key must be provided');

  const now = Date.now();
  const clampedTo = now - (now % 60000) - 60000;

  const toMs = fixedToMs ?? clampedTo;
  const minutes = maxLookbackMinutes ?? (
    timeframeFilter ? getDefaultLookbackMinutes(timeframeFilter) : 60 * 24 * 365
  );
  const fromMs = fixedFromMs ?? (toMs - minutes * 60 * 1000);

  console.log(`[fetchCandlesForScan] ${symbol} (${timeframeFilter ?? 'all'}) ${new Date(fromMs).toISOString()} → ${new Date(toMs).toISOString()}`);

  const all1mCandles = await fetchCandlesFromPolygon(symbol, fromMs, toMs);
  if (all1mCandles.length === 0) return {};

  const fromSec = fromMs / 1000;
  const toSec = toMs / 1000;

  const adjustedFrom = getNextValidCandleTime(all1mCandles, fromSec);
  const adjustedTo = getPrevValidCandleTime(all1mCandles, toSec);

  console.log(`📌 Valid Range for ${symbol}: ${new Date((adjustedFrom ?? fromSec) * 1000).toISOString()} → ${new Date((adjustedTo ?? toSec) * 1000).toISOString()}`);

  if (timeframeFilter && timeframeFilter !== '1m') {
    const aggregated = aggregateCandles(all1mCandles, [timeframeFilter]);
    return { [timeframeFilter]: aggregated[timeframeFilter] };
  }

  if (timeframeFilter === '1m') return { '1m': all1mCandles };

  const allAggregated = aggregateCandles(all1mCandles);
  return {
    '1m': all1mCandles,
    ...allAggregated,
  };
}
