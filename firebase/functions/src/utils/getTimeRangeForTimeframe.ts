// 📁 /firebase/functions/src/utils/getTimeRangeForTimeframe.ts

import { Timeframe } from '../../../../shared/data/Timeframe.js';

export interface TimeRange {
  from: number;       // milliseconds
  to: number;         // milliseconds
  fromSec: number;    // seconds
  toSec: number;      // seconds
}

/**
 * Returns a time range for scanning, supporting both ms and sec.
 */
export function getTimeRangeForTimeframe(
  timeframe: Timeframe,
  mode: 'light' | 'full' = 'light'
): TimeRange {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const lookbackMap: Record<'light' | 'full', Record<Timeframe, number>> = {
    light: {
      '1m': oneDay * 2,
      '5m': oneDay * 5,
      '15m': oneDay * 7,
      '30m': oneDay * 10,
      '1h': oneDay * 20,
      '4h': oneDay * 60,
      'D': oneDay * 90,
      'W': oneDay * 365,
    },
    full: {
      '1m': oneDay * 60,
      '5m': oneDay * 120,
      '15m': oneDay * 180,
      '30m': oneDay * 240,
      '1h': oneDay * 365,
      '4h': oneDay * 365 * 1.5,
      'D': oneDay * 365,
      'W': oneDay * 365 * 2,
    },
  };

  const lookback = lookbackMap[mode][timeframe] ?? oneDay * 5;

  const clampedTo = now - (now % 60000) - 60000; // round down to last full minute

  const from = clampedTo - lookback;
  const to = clampedTo;

  return {
    from,
    to,
    fromSec: Math.floor(from / 1000),
    toSec: Math.floor(to / 1000),
  };
}
