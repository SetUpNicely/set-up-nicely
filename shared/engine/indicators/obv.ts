import { CandleData } from '../../data/CandleData.js';

export function calculateOBV(candles: CandleData[], index: number): number {
  let obv = 0;

  for (let i = 1; i <= index; i++) {
    const prevClose = candles[i - 1].close;
    const currClose = candles[i].close;
    const volume = candles[i].volume;

    if (currClose > prevClose) obv += volume;
    else if (currClose < prevClose) obv -= volume;
  }

  return obv;
}
