import { CandleData } from '../../data/CandleData.js';

/**
 * Gets premarket high and low based on ET (typically 4:00 AM – 9:30 AM)
 */
export function getPremarketLevels(candles: CandleData[]): { high: number, low: number } {
  const premarketCandles = candles.filter(c => {
    const date = new Date(c.timestamp);
    const hourET = date.toLocaleString('en-US', {
      hour12: false,
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
    });

    return hourET >= '04:00' && hourET < '09:30';
  });

  if (premarketCandles.length === 0) return { high: 0, low: 0 };

  const high = Math.max(...premarketCandles.map(c => c.high));
  const low = Math.min(...premarketCandles.map(c => c.low));
  return { high, low };
}
