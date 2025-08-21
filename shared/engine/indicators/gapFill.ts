import { CandleData } from '../../data/CandleData.js';

/**
 * Detects if a gap (between prior close and today's open) has been filled.
 * 
 * - Uses timestamps in milliseconds.
 * - Treats day boundaries using ET (New York time).
 * - Returns true if current close is within 10% of the gap size.
 */
export function detectGapFill(candles: CandleData[], index: number): boolean {
  if (candles.length < 2 || index >= candles.length) return false;

  const currentCandle = candles[index];
  const currentDay = getETDate(currentCandle.timestamp);

  let priorClose: number | undefined;
  let todayOpen: number | undefined;

  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];

    const prevDay = getETDate(prev.timestamp);
    const currDay = getETDate(curr.timestamp);

    // Detect prior day's close
    if (prevDay !== currDay && prevDay !== currentDay) {
      priorClose = prev.close;
    }

    // Detect today's open
    if (!todayOpen && currDay === currentDay) {
      todayOpen = curr.open;
    }

    if (priorClose && todayOpen) break;
  }

  if (priorClose === undefined || todayOpen === undefined) return false;

  const gapSize = todayOpen - priorClose;
  const filled = Math.abs(currentCandle.close - priorClose) < Math.abs(gapSize * 0.1);

  return filled;
}

function getETDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', { timeZone: 'America/New_York' });
}
