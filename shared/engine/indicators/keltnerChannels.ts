import { CandleData } from '../../data/CandleData.js';
import { calculateEMA } from './ema.js';
import { calculateATR } from './atr.js';

export function detectKeltnerSqueeze(candles: CandleData[], index: number): boolean {
  const ema = calculateEMA(candles, 20, index);
  const atr = calculateATR(candles, 10, index);
  const upper = ema + 1.5 * atr;
  const lower = ema - 1.5 * atr;

  return candles[index].high < upper && candles[index].low > lower;
}
