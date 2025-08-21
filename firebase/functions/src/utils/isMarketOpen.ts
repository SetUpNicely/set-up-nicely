/**
 * Returns true if current UTC time is during extended U.S. trading hours
 * including premarket and postmarket, with a 1-minute buffer on both ends.
 * Full range: 08:01–23:59 UTC (4:01 AM – 7:59 PM ET)
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // Sunday = 0, Saturday = 6
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  const time = hour + minute / 60;

  return (
    day >= 1 && day <= 5 &&    // Monday–Friday
    time >= 8.016 && time < 23.983 // 08:01–23:59 UTC
  );
}
