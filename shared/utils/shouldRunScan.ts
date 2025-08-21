// 📍 /shared/utils/shouldRunScan.ts
import { Timeframe } from '../data/Timeframe';

export function timeframeToMs(tf: Timeframe): number {
  switch (tf) {
    case '1m': return 1 * 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '30m': return 30 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    case '4h': return 4 * 60 * 60 * 1000;
    case 'D': return 24 * 60 * 60 * 1000;
    case 'W': return 7 * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

export function shouldRunScan(timeframe: Timeframe, lastCandleTime: number): boolean {
  const now = Date.now();
  const intervalMs = timeframeToMs(timeframe);

  // Round down now to most recent valid close time
  const alignedNow = Math.floor(now / intervalMs) * intervalMs;

  return alignedNow > lastCandleTime;
}
