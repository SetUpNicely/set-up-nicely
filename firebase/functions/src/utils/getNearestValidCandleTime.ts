// 📁 /firebase/functions/src/utils/getNearestValidCandleTime.ts

import { CandleData } from '../../../../shared/data/CandleData.js';

/**
 * Finds the nearest valid candle time >= targetStart.
 */
export function getNextValidCandleTime(
  candles: CandleData[],
  targetStart: number
): number | null {
  for (const c of candles) {
    if (c.timestamp >= targetStart) return c.timestamp;
  }
  return null;
}

/**
 * Finds the nearest valid candle time <= targetEnd.
 */
export function getPrevValidCandleTime(
  candles: CandleData[],
  targetEnd: number
): number | null {
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].timestamp <= targetEnd) return candles[i].timestamp;
  }
  return null;
}
