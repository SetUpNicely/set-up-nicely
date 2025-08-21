import { CandleData } from '../../data/CandleData.js';

/**
 * Calculates Simple Moving Average (SMA) at a specific index.
 *
 * @param candles - Array of candles
 * @param length - Number of candles to average
 * @param index - Index of the candle to calculate SMA for
 * @returns SMA value or 0 if not enough candles
 */
export function calculateSMA(
  candles: CandleData[],
  length: number,
  index: number
): number {
  if (length <= 0 || index < length - 1 || index >= candles.length) return 0;

  let sum = 0;
  for (let i = index - length + 1; i <= index; i++) {
    sum += candles[i].close;
  }

  return sum / length;
}
