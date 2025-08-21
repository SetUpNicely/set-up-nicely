// 📁 /firebase/functions/src/utils/getValidMarketRange.ts

/**
 * Returns a safe [fromSec, toSec] UNIX time range for market candles.
 * - Caps `to` at now minus a small buffer (Polygon rejects future timestamps).
 * - Shifts to previous Friday if the date lands on a weekend.
 * - Ensures from/to are both valid market days/times.
 */

export function getValidMarketRange(
  minutes: number = 1440,
  toDate?: Date
): { fromSec: number; toSec: number } {
  const BUFFER_MS = 2 * 60 * 1000; // Avoid timestamps too close to "now"
  const now = Date.now();

  let to = toDate?.getTime() ?? now;
  to = Math.min(to, now - BUFFER_MS);

  // 🔁 If 'to' is on a weekend, backtrack to previous Friday
  let toDateObj = new Date(to);
  let toDay = toDateObj.getUTCDay(); // Sunday = 0, Saturday = 6

  if (toDay === 6) {
    // Saturday → Friday
    toDateObj.setUTCDate(toDateObj.getUTCDate() - 1);
  } else if (toDay === 0) {
    // Sunday → Friday
    toDateObj.setUTCDate(toDateObj.getUTCDate() - 2);
  }

  // Clamp to 1-minute boundary and apply buffer
  toDateObj.setUTCSeconds(0, 0); // Remove seconds and ms
  const clampedTo = toDateObj.getTime() - BUFFER_MS;
  const from = clampedTo - minutes * 60 * 1000;

  return {
    fromSec: Math.floor(from / 1000),
    toSec: Math.floor(clampedTo / 1000),
  };
}
