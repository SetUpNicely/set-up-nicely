import { CandleData } from '../../data/CandleData.js';

/**
 * Returns the high and low of the opening range (first 15 minutes of regular session).
 * Filters candles between 9:30am and 9:45am ET.
 */
export function detectOpeningRange(candles: CandleData[]): { high: number; low: number } {
  const openingCandles = candles.filter(c => isRegularSessionOpening(c.timestamp));
  if (openingCandles.length === 0) return { high: 0, low: 0 };

  const high = Math.max(...openingCandles.map(c => c.high));
  const low = Math.min(...openingCandles.map(c => c.low));
  return { high, low };
}

/**
 * Checks if a timestamp is between 9:30 AM and 9:45 AM ET.
 */
function isRegularSessionOpening(timestamp: number): boolean {
  const date = new Date(timestamp);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const totalMinutes = hours * 60 + minutes;

  // 9:30 AM to 9:44 AM ET = 570 to 584 UTC minutes
  return totalMinutes >= 570 && totalMinutes < 585;
}
