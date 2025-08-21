// 📁 /firebase/functions/src/calculatePVSFromHistory.ts

import { PresetScanDefinition } from '../../../shared/data/presetScans.js';
import { CandleData } from '../../../shared/data/CandleData.js';
import { Timeframe } from '../../../shared/data/Timeframe.js';
import { calculatePVS, PVSResult } from './calculatePVS.js';

/**
 * Reuses the unified PVS scoring system to simulate how a setup performed after triggering.
 */
export async function simulatePVSFromTrigger({
  scan,
  candles,
  triggerIndex,
  timeframe,
}: {
  scan: PresetScanDefinition;
  candles: CandleData[];
  triggerIndex: number;
  timeframe: Timeframe;
}): Promise<PVSResult> {
  return calculatePVS({ scan, candles, triggerIndex, timeframe });
}

/**
 * Averages the PVS scores across a set of trigger results.
 */
export function calculatePVSFromHistory(triggers: PVSResult[]): number {
  if (!triggers.length) return 0;
  const total = triggers.reduce((sum, t) => sum + (t.pvsScore ?? 0), 0);
  return Math.round(total / triggers.length);
}
