// 📁 /src/services/chartService.ts
import { CandleData } from '@shared/data/CandleData';
import { fetchCandles } from './marketDataService';
import { aggregateCandles } from '../../firebase/functions/src/utils/aggregatedCandles';

type AggregatableTimeframe = '5m' | '15m' | '30m' | '1h' | '4h' | 'D' | 'W';

/**
 * Fetches candles before and after a trigger to render a mini chart,
 * using 1m base data and aggregating to match the scan's timeframe.
 * @param symbol Ticker symbol (e.g. AAPL)
 * @param timestamp Trigger candle timestamp
 * @param timeframe Timeframe string (e.g. '1m', '5m')
 * @returns Array of CandleData including pre and post-trigger candles
 */
export async function getMiniChartCandles(
  symbol: string,
  timestamp: string,
  timeframe: '1m' | AggregatableTimeframe
): Promise<CandleData[]> {
  const preTriggerCount = 20;
  const postTriggerCount = 10;

  const triggerDate = new Date(timestamp);

  const start = new Date(triggerDate);
  start.setMinutes(start.getMinutes() - preTriggerCount);

  const end = new Date(triggerDate);
  end.setMinutes(end.getMinutes() + postTriggerCount);

  // Fetch all 1m candles and filter by window
  const allCandles = await fetchCandles(symbol);
  const candles1m = allCandles.filter(
    (c) => c.timestamp >= start.getTime() && c.timestamp <= end.getTime()
  );

  if (timeframe === '1m') return candles1m;

  const aggregated = aggregateCandles(candles1m);
  return aggregated[timeframe as AggregatableTimeframe] ?? [];
}
