import { CandleData } from '../../data/CandleData.js';
import { calculateEMA } from './ema.js';

export function calculateTEMA(candles: CandleData[], length: number, index: number): number {
  // Step 1: First EMA
  const ema1Series = candles.map((_, i) => calculateEMA(candles, length, i));
  const ema1 = ema1Series[index];

  // Step 2: EMA of EMA1
  const ema2Series = ema1Series.map((value, i) => ({
    ...candles[i],
    close: value,
  }));
  const ema2 = calculateEMA(ema2Series, length, index);

  // Step 3: EMA of EMA2
  const ema3Series = ema2Series.map((value, i) => ({
    ...candles[i],
    close: calculateEMA(ema2Series, length, i),
  }));
  const ema3 = calculateEMA(ema3Series, length, index);

  // Final TEMA formula
  return 3 * (ema1 - ema2) + ema3;
}
