import { CandleData } from '../../data/CandleData.js';

/**
 * Calculates the Average Directional Index (ADX) at a given candle index.
 * - Based on true range and directional movement over a window
 * - Uses all available candles including premarket/after-hours
 *
 * @param candles - Array of intraday candles (including full session)
 * @param length - Lookback period for smoothing (e.g., 14)
 * @param index - Index to calculate ADX for
 * @returns ADX value (0–100 range)
 */
export function calculateADX(
  candles: CandleData[],
  length: number,
  index: number
): number {
  if (index < length || index >= candles.length) return 0;

  let trSum = 0;
  let pdmSum = 0;
  let ndmSum = 0;

  for (let i = index - length + 1; i <= index; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];
    if (!prev) continue;

    const upMove = curr.high - prev.high;
    const downMove = prev.low - curr.low;

    const plusDM = upMove > downMove && upMove > 0 ? upMove : 0;
    const minusDM = downMove > upMove && downMove > 0 ? downMove : 0;

    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low - prev.close)
    );

    trSum += tr;
    pdmSum += plusDM;
    ndmSum += minusDM;
  }

  if (trSum === 0) return 0;

  const pdi = (pdmSum / trSum) * 100;
  const ndi = (ndmSum / trSum) * 100;
  const dx = (Math.abs(pdi - ndi) / Math.max(pdi + ndi, 1)) * 100;

  return dx;
}
