import { CandleData } from '../../data/CandleData.js';

export function calculateStochastic(
  candles: CandleData[],
  index: number,
  length: number = 14
): { k: number; d: number } {
  if (index < length - 1) return { k: 0, d: 0 };

  // Calculate %K
  const slice = candles.slice(index - length + 1, index + 1);
  const high = Math.max(...slice.map(c => c.high));
  const low = Math.min(...slice.map(c => c.low));
  const close = candles[index].close;

  const k = (high - low === 0) ? 0 : ((close - low) / (high - low)) * 100;

  // Calculate %D = 3-period SMA of %K
  const kValues: number[] = [];
  for (let i = index - 2; i <= index; i++) {
    if (i < length - 1) continue;

    const s = candles.slice(i - length + 1, i + 1);
    const h = Math.max(...s.map(c => c.high));
    const l = Math.min(...s.map(c => c.low));
    const c = candles[i].close;
    const kVal = h - l === 0 ? 0 : ((c - l) / (h - l)) * 100;
    kValues.push(kVal);
  }

  const d = kValues.length ? kValues.reduce((a, b) => a + b, 0) / kValues.length : 0;

  return { k, d };
}
