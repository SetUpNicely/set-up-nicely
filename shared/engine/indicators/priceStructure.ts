import { CandleData } from '../../data/CandleData.js';

export function detectPriceStructure(candles: CandleData[], index: number): 'HH/HL' | 'LL/LH' | null {
  const curr = candles[index];
  const prev = candles[index - 1];

  if (curr.high > prev.high && curr.low > prev.low) return 'HH/HL';
  if (curr.high < prev.high && curr.low < prev.low) return 'LL/LH';
  return null;
}
