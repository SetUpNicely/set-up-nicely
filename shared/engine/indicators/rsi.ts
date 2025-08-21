import { CandleData } from '../../data/CandleData.js';

/**
 * Calculates the Relative Strength Index (RSI) at a given index.
 * - Uses the standard Wilder's method (average gains vs losses).
 * - Ensures the rolling window (length) is valid relative to index.
 *
 * @param candles - Array of candle data
 * @param length - Lookback period (commonly 14)
 * @param index - Index at which to calculate RSI
 * @returns RSI value (0-100)
 */
export function calculateRSI(
  candles: CandleData[],
  length: number,
  index: number
): number {
  if (index < length || index >= candles.length) {
    return 0; // Not enough data
  }

  let gains = 0;
  let losses = 0;

  for (let i = index - length + 1; i <= index; i++) {
    if (i <= 0) continue;
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) {
      gains += diff;
    } else {
      losses -= diff; // negative diff turned positive for loss
    }
  }

  const averageGain = gains / length;
  const averageLoss = losses / length;

  const rs = averageLoss === 0 ? 100 : averageGain / averageLoss;
  return 100 - 100 / (1 + rs);
}
