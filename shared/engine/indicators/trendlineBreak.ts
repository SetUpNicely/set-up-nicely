import { CandleData } from '../../data/CandleData.js';


export function detectTrendlineBreak(
  candles: CandleData[],
  index: number,
  trendline: number[],
  bufferPercent = 0.25 // Optional tolerance buffer (0.25%)
): 'breakAbove' | 'breakBelow' | null {
  if (index === 0 || !trendline[index] || !trendline[index - 1]) return null;

  const prevClose = candles[index - 1].close;
  const currClose = candles[index].close;
  const prevTrend = trendline[index - 1];
  const currTrend = trendline[index];

  const buffer = currTrend * (bufferPercent / 100);

  // From below to above (breakout)
  if (prevClose < prevTrend - buffer && currClose > currTrend + buffer) {
    return 'breakAbove';
  }

  // From above to below (breakdown)
  if (prevClose > prevTrend + buffer && currClose < currTrend - buffer) {
    return 'breakBelow';
  }

  return null;
}
