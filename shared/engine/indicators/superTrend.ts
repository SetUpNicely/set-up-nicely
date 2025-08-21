import { CandleData } from '../../data/CandleData.js';
import { calculateATR } from './atr.js';

export function calculateSuperTrend(candles: CandleData[], index: number, period = 10, multiplier = 3): number {
  const atr = calculateATR(candles, period, index);
  const hl2 = (candles[index].high + candles[index].low) / 2;
  const upperBand = hl2 + multiplier * atr;
  const lowerBand = hl2 - multiplier * atr;

  return candles[index].close > upperBand ? 1 : candles[index].close < lowerBand ? -1 : 0;
}
