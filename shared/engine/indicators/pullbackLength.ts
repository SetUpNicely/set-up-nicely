import { CandleData } from '../../data/CandleData.js';

export function countPullback(candles: CandleData[], index: number): number {
  let count = 0;
  for (let i = index; i > 0 && candles[i].close < candles[i - 1].close; i--) {
    count++;
  }
  return count;
}
