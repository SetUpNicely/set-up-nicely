import { CandleData } from '../../data/CandleData.js';

export function calculateDonchianChannels(candles: CandleData[], length: number, index: number) {
  const slice = candles.slice(Math.max(0, index - length + 1), index + 1);
  const high = Math.max(...slice.map(c => c.high));
  const low = Math.min(...slice.map(c => c.low));
  return { upper: high, lower: low, mid: (high + low) / 2 };
}
