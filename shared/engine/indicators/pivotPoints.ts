import { CandleData } from '../../data/CandleData.js';

// Utility: Returns YYYY-MM-DD in ET
function getETDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}

export function calculatePivotPoints(candles: CandleData[], index: number): {
  r1: number;
  s1: number;
  r2: number;
  s2: number;
  r3: number;
  s3: number;
} {
  const currentDay = getETDate(candles[index].timestamp);
  let priorDay = '';
  let dayCandles: CandleData[] = [];

  // Reverse scan to find previous full regular session
  for (let i = index - 1; i >= 0; i--) {
    const day = getETDate(candles[i].timestamp);

    if (!priorDay) {
      if (day !== currentDay) {
        priorDay = day;
        dayCandles.push(candles[i]);
      }
    } else if (day === priorDay) {
      dayCandles.push(candles[i]);
    } else {
      break;
    }
  }

  if (dayCandles.length === 0) {
    return { r1: 0, s1: 0, r2: 0, s2: 0, r3: 0, s3: 0 };
  }

  const high = Math.max(...dayCandles.map(c => c.high));
  const low = Math.min(...dayCandles.map(c => c.low));
  const close = dayCandles[0].close;

  const pivot = (high + low + close) / 3;

  return {
    r1: 2 * pivot - low,
    s1: 2 * pivot - high,
    r2: pivot + (high - low),
    s2: pivot - (high - low),
    r3: high + 2 * (pivot - low),
    s3: low - 2 * (high - pivot),
  };
}
