import { CandleData } from '../../data/CandleData.js';

export function calculateWilliamsR(candles: CandleData[], index: number, length = 14): number {
  const slice = candles.slice(Math.max(0, index - length + 1), index + 1);
  const highestHigh = Math.max(...slice.map(c => c.high));
  const lowestLow = Math.min(...slice.map(c => c.low));
  const close = candles[index].close;

  return ((highestHigh - close) / (highestHigh - lowestLow)) * -100;
}
