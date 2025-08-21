import { CandleData } from '../../data/CandleData.js';

/**
 * Calculates VWAP using only candles from the current trading session.
 * Assumes each candle has a UNIX timestamp in **milliseconds**.
 * Session start time is 9:30 AM ET.
 */
export function calculateVWAP(candles: CandleData[], index: number): number {
  if (index >= candles.length) return 0;

  const sessionStart = getSessionStartTime(candles[index].timestamp);

  let cumulativePV = 0;
  let cumulativeVolume = 0;

  for (let i = 0; i <= index; i++) {
    const candle = candles[i];
    if (candle.timestamp < sessionStart) continue;

    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativePV += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
  }

  return cumulativeVolume === 0 ? 0 : cumulativePV / cumulativeVolume;
}

/**
 * Returns the UNIX ms timestamp for 9:30 AM ET on the same day as the input timestamp.
 */
function getSessionStartTime(timestamp: number): number {
  const date = new Date(timestamp);

  // Convert to ET (New York)
  const utcHour = date.getUTCHours();
  const offset = getETOffsetHours(date); // EST = -5, EDT = -4
  const localHour = utcHour + offset;

  // Reset to 9:30 AM ET
  date.setUTCHours(13 - offset, 30, 0, 0); // 13:30 UTC = 9:30 ET
  return date.getTime();
}

/**
 * Determines if the date is in daylight saving time for Eastern Time.
 */
function getETOffsetHours(date: Date): number {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  const isDST = date.getTimezoneOffset() < Math.max(jan, jul);
  return isDST ? -4 : -5;
}
