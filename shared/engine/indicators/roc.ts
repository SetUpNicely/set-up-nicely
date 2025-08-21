import { CandleData } from '../../data/CandleData.js';

export function calculateROC(candles: CandleData[], length: number, index: number): number {
  if (index < length) return 0;
  const pastClose = candles[index - length].close;
  const currentClose = candles[index].close;
  return ((currentClose - pastClose) / pastClose) * 100;
}
