import { CandleData } from '../../data/CandleData.js';
import { calculateRSI } from './rsi.js';

export function detectRSIDivergence(candles: CandleData[], index: number): 'bullish' | 'bearish' | null {
  const rsiNow = calculateRSI(candles, 14, index);
  const rsiPrev = calculateRSI(candles, 14, index - 5);
  const priceNow = candles[index].close;
  const pricePrev = candles[index - 5].close;

  if (priceNow < pricePrev && rsiNow > rsiPrev) return 'bullish';
  if (priceNow > pricePrev && rsiNow < rsiPrev) return 'bearish';
  return null;
}
