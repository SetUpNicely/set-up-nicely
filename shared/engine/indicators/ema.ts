import { CandleData } from '../../data/CandleData.js';

/**
 * Calculates the Exponential Moving Average (EMA) at a specific index.
 *
 * @param candles - Array of candles
 * @param length - EMA period length
 * @param index - Index of the candle to calculate EMA for
 * @returns EMA value or 0 if not enough candles
 */
export function calculateEMA(
  candles: CandleData[],
  length: number,
  index: number
): number {
  if (length <= 0 || index < length || index >= candles.length) return 0;

  const k = 2 / (length + 1);
  let ema = candles[index - length].close;

  for (let i = index - length + 1; i <= index; i++) {
    ema = candles[i].close * k + ema * (1 - k);
  }

  return ema;
}
