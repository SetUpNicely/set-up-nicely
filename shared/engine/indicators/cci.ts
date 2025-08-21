import { CandleData } from '../../data/CandleData.js';

/**
 * Calculates the Commodity Channel Index (CCI) for a given index.
 * - Uses typical price: (high + low + close) / 3
 * - Uses full-session candles by default
 *
 * @param candles - Array of candle data
 * @param length - Lookback period (commonly 14 or 20)
 * @param index - Index of the candle to calculate CCI
 * @returns CCI value
 */
export function calculateCCI(
  candles: CandleData[],
  length: number,
  index: number
): number {
  if (index < length - 1 || index >= candles.length) return 0;

  const slice = candles.slice(index - length + 1, index + 1);
  const typicalPrices = slice.map(c => (c.high + c.low + c.close) / 3);
  const mean = typicalPrices.reduce((a, b) => a + b, 0) / typicalPrices.length;
  const meanDeviation =
    typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - mean), 0) / typicalPrices.length;

  if (meanDeviation === 0) return 0;

  const currentTP = (candles[index].high + candles[index].low + candles[index].close) / 3;
  return (currentTP - mean) / (0.015 * meanDeviation);
}
