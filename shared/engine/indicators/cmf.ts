import { CandleData } from '../../data/CandleData.js';

/**
 * Calculates the Chaikin Money Flow (CMF) at a given index.
 * - CMF = (Sum of Money Flow Volume over period) / (Sum of Volume over period)
 * - Uses full-session candles (default 20-period)
 *
 * @param candles - Array of candle data
 * @param index - Current candle index
 * @param length - Lookback period (default = 20)
 * @returns CMF value
 */
export function calculateCMF(
  candles: CandleData[],
  index: number,
  length: number = 20
): number {
  if (index < length - 1 || index >= candles.length) return 0;

  let mfvSum = 0;
  let volumeSum = 0;

  for (let i = index - length + 1; i <= index; i++) {
    const c = candles[i];
    const highLowRange = c.high - c.low;

    // Avoid division by zero if candle has no range
    const mfm = highLowRange === 0
      ? 0
      : ((c.close - c.low) - (c.high - c.close)) / highLowRange;

    const mfv = mfm * c.volume;
    mfvSum += mfv;
    volumeSum += c.volume;
  }

  return volumeSum === 0 ? 0 : mfvSum / volumeSum;
}
