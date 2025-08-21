import { CandleData } from '../../data/CandleData.js';

/**
 * Calculates Bollinger Bands for a given index.
 * - Uses full session candles (including premarket/after-hours).
 * - Based on the standard 2-sigma method over a rolling window.
 *
 * @param candles - Array of candle data
 * @param length - Lookback period (e.g., 20)
 * @param index - Index of the current candle
 * @returns Object containing upper, middle (SMA), and lower bands
 */
export function calculateBollingerBands(
  candles: CandleData[],
  length: number,
  index: number
) {
  if (index < length - 1 || index >= candles.length) {
    return { upper: 0, middle: 0, lower: 0 };
  }

  const slice = candles.slice(index - length + 1, index + 1);
  const closes = slice.map(c => c.close);
  const mean = closes.reduce((a, b) => a + b, 0) / closes.length;
  const stdDev = Math.sqrt(
    closes.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / closes.length
  );

  return {
    upper: mean + 2 * stdDev,
    middle: mean,
    lower: mean - 2 * stdDev,
  };
}
