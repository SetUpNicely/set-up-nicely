import { CandleData } from '../../data/CandleData.js';

export function calculateIchimoku(candles: CandleData[], index: number) {
  const getMid = (slice: CandleData[]) =>
    (Math.max(...slice.map(c => c.high)) + Math.min(...slice.map(c => c.low))) / 2;

  const tenkan = getMid(candles.slice(index - 9 + 1, index + 1));
  const kijun = getMid(candles.slice(index - 26 + 1, index + 1));
  const senkouA = (tenkan + kijun) / 2;
  const senkouB = getMid(candles.slice(index - 52 + 1, index + 1));

  return { tenkan, kijun, senkouA, senkouB };
}
