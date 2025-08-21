// 📁 firebase/functions/src/utils/aggregatedCandles.ts
import { CandleData } from '../../shared/data/CandleData.js';
import { Timeframe } from '../../shared/data/Timeframe.js';

/**
 * Aggregates 1-minute candles into one or more timeframe buckets.
 * @param candles - Array of 1m candles
 * @param only - Optional list of timeframes to aggregate (e.g. ['15m'])
 * @returns Object with aggregated candles for selected timeframes
 */
export function aggregateCandles(
  candles: CandleData[],
  only?: Timeframe[]
): Partial<Record<Exclude<Timeframe, '1m'>, CandleData[]>> {
  if (!candles.length) return {};

  // 🔒 Safety: Ensure candles are sorted by timestamp
  candles.sort((a, b) => a.timestamp - b.timestamp);

  const timeframes: Record<Exclude<Timeframe, '1m'>, number> = {
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '4h': 240,
    'D': 1440,
    'W': 10080,
  };

  const output: Partial<Record<Exclude<Timeframe, '1m'>, CandleData[]>> = {};

  for (const [label, minutes] of Object.entries(timeframes) as [Exclude<Timeframe, '1m'>, number][]) {
    if (only && !only.includes(label)) continue;

    const intervalMs = minutes * 60 * 1000;
    const grouped: Record<number, CandleData[]> = {};

    for (const candle of candles) {
      const rounded = Math.floor(candle.timestamp / intervalMs) * intervalMs;
      if (!grouped[rounded]) grouped[rounded] = [];
      grouped[rounded].push(candle);
    }

    output[label] = Object.entries(grouped)
      .map(([timestampStr, group]) => {
        const timestamp = parseInt(timestampStr, 10);
        const symbol = group[0]?.symbol ?? 'UNKNOWN';
        return {
          symbol,
          timestamp,
          open: group[0].open,
          high: Math.max(...group.map(c => c.high)),
          low: Math.min(...group.map(c => c.low)),
          close: group[group.length - 1].close,
          volume: group.reduce((sum, c) => sum + c.volume, 0),
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  return output;
}
