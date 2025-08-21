// Utility functions for detecting volume anomalies in historical candle data

import { CandleData } from '@shared/data/CandleData';

// Returns true if current volume is significantly higher than recent average
export function isVolumeSpike(candles: CandleData[], index: number, multiplier = 2): boolean {
  if (index < 10) return false; // not enough history

  const recent = candles.slice(index - 10, index);
  const avgVolume =
    recent.reduce((sum, c) => sum + (c.volume ?? 0), 0) / recent.length;

  const currentVolume = candles[index].volume ?? 0;
  return currentVolume >= avgVolume * multiplier;
}

// Calculates relative volume (RVOL): current volume vs. average of past N candles
export function calculateRVOL(candles: CandleData[], index: number, lookback = 20): number {
  if (index < lookback) return 0;

  const recent = candles.slice(index - lookback, index);
  const avgVolume =
    recent.reduce((sum, c) => sum + (c.volume ?? 0), 0) / lookback;

  const currentVolume = candles[index].volume ?? 0;
  return avgVolume === 0 ? 0 : currentVolume / avgVolume;
}

// Flags a volume divergence or exhaustion (useful for reversals)
export function isVolumeDrop(candles: CandleData[], index: number, threshold = 0.5): boolean {
  if (index < 5) return false;

  const recent = candles.slice(index - 5, index);
  const avgVolume =
    recent.reduce((sum, c) => sum + (c.volume ?? 0), 0) / recent.length;

  const currentVolume = candles[index].volume ?? 0;
  return currentVolume < avgVolume * threshold;
}
