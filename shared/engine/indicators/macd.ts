import { CandleData } from '../../data/CandleData.js';
import { calculateEMA } from './ema.js';

/**
 * Calculates the MACD, Signal Line, and Histogram at a given index.
 *
 * @param candles - Array of candle data
 * @param index - Index at which to calculate MACD
 * @returns Object with macd, signal, and histogram values, or zeros if not enough data
 */
export function calculateMACD(
  candles: CandleData[],
  index: number
): { macd: number; signal: number; histogram: number } {
  if (index < 26 || index >= candles.length) {
    return { macd: 0, signal: 0, histogram: 0 };
  }

  const ema12 = calculateEMA(candles, 12, index);
  const ema26 = calculateEMA(candles, 26, index);
  const macdLine = ema12 - ema26;

  // Build history of MACD values for signal line (9-period EMA of macdLine)
  const macdHistory: number[] = [];

  for (let i = index - 8; i <= index; i++) {
    if (i < 26) continue; // skip until enough data for EMA26
    const ema12_i = calculateEMA(candles, 12, i);
    const ema26_i = calculateEMA(candles, 26, i);
    macdHistory.push(ema12_i - ema26_i);
  }

  const signalLine =
    macdHistory.length > 0
      ? macdHistory.reduce((a, b) => a + b, 0) / macdHistory.length
      : 0;

  return {
    macd: macdLine,
    signal: signalLine,
    histogram: macdLine - signalLine,
  };
}
