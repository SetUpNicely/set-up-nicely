import { CandleData } from '../../data/CandleData.js';

/**
 * Detects a volume surge at the given candle index.
 * Compares current volume to the average of the previous 20 candles.
 * 
 * @param candles - Full list of CandleData
 * @param index - Index of the candle to evaluate
 * @param multiplier - Surge threshold multiplier (default: 1.5)
 * @returns true if current volume exceeds average * multiplier
 */
export function detectVolumeSurge(
  candles: CandleData[],
  index: number,
  multiplier = 1.5
): boolean {
  if (index < 20 || index >= candles.length) return false;

  const avgVolume =
    candles.slice(index - 20, index).reduce((sum, c) => sum + c.volume, 0) / 20;

  return candles[index].volume > avgVolume * multiplier;
}
