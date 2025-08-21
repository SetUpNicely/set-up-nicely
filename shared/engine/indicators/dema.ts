import { CandleData } from '../../data/CandleData.js';
import { calculateEMA } from './ema.js';

export function calculateDEMA(candles: CandleData[], length: number, index: number): number {
  const ema = calculateEMA(candles, length, index);
  const emaOfEma = calculateEMA(
    candles.map((_, i) => ({ ...candles[i], close: calculateEMA(candles, length, i) })),
    length,
    index
  );
  return 2 * ema - emaOfEma;
}
