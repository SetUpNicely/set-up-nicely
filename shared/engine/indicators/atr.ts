import { CandleData } from '../../data/CandleData.js';

/**
 * Calculates the Average True Range (ATR) at a given index.
 * - ATR reflects volatility by averaging true range over N candles.
 * - Uses full session candles (including premarket/after-hours).
 *
 * @param candles - Array of candle data
 * @param length - Lookback period (e.g., 14)
 * @param index - Current index for ATR calculation
 * @returns ATR value
 */
export function calculateATR(
  candles: CandleData[],
  length: number,
  index: number
): number {
  if (index < length || index >= candles.length) return 0;

  const trs: number[] = [];

  for (let i = index - length + 1; i <= index; i++) {
    const curr = candles[i];
    const prev = candles[i - 1] ?? curr;

    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );

    trs.push(tr);
  }

  const sum = trs.reduce((a, b) => a + b, 0);
  return sum / trs.length;
}
