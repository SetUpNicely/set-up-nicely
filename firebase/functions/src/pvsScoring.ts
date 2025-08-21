// 📁 /src/logic/pvsScoring.ts

import { CandleData } from '../../../shared/data/CandleData.js';
import { PresetScanDefinition } from '../../../shared/data/presetScans.js';
import { evaluateScanLogic } from './evaluateScanLogic.js';
import { calculateAllIndicators } from '../../../shared/engine/indicators/calculateAllIndicators.js';
import { expectedMoves } from '../../../shared/logic/expectedMoves.js';

type PVSInputs = {
  candles: CandleData[];
  scan: PresetScanDefinition;
  lookahead: number;
};

export type PVSScore = {
  finalScore: number;
  hitRate: number;
  rrScore: number;
  speedScore: number;
  moveScore: number;
  continuationScore: number;
  falseSignalRate: number;
  sampleSizeBonus: number;
};

export function calculatePVS({
  candles,
  scan,
  lookahead
}: PVSInputs): PVSScore {
  const tf = scan.timeframe || 'D';
  const targetPct = expectedMoves[tf] ?? 0.02;
  const stopPct = targetPct / 2;

  const results: {
    hit: boolean;
    rr: number;
    speed: number;
    movePct: number;
    continuation: number;
    falseSignal: boolean;
  }[] = [];

  for (let i = 0; i < candles.length - lookahead; i++) {
    const sliced = candles.slice(0, i + 1);
    const currentCandle = sliced[sliced.length - 1];
    const indicators = calculateAllIndicators(sliced);
    const triggered = evaluateScanLogic(scan.logic, indicators);

    if (triggered) {
      const entry = currentCandle.close;
      const target = entry * (1 + targetPct);
      const stop = entry * (1 - stopPct);
      const future = candles.slice(i + 1, i + 1 + lookahead);

      let hit = false;
      let rr = 0;
      let speed = lookahead;
      let movePct = 0;
      let falseSignal = true;

      for (let j = 0; j < future.length; j++) {
        const hi = future[j].high;
        const lo = future[j].low;

        if (hi >= target) {
          hit = true;
          rr = (target - entry) / (entry - stop);
          speed = j + 1;
          movePct = (hi - entry) / (target - entry);
          falseSignal = false;
          break;
        }

        if (lo <= stop) {
          falseSignal = true;
          movePct = (lo - entry) / (target - entry);
          break;
        }
      }
        const continuation = indicators.rsi > 50 && (indicators.macdHist ?? 0) > 0 ? 1 : 0;


      results.push({ hit, rr, speed, movePct, continuation, falseSignal });
    }
  }

  const total = results.length || 1;
  const hits = results.filter(r => r.hit).length;
  const hitRate = hits / total;
  const rrScore = results.reduce((sum, r) => sum + r.rr, 0) / total;
  const avgSpeed = results.reduce((sum, r) => sum + r.speed, 0) / total;
  const moveScore = results.reduce((sum, r) => sum + r.movePct, 0) / total;
  const continuationScore = results.reduce((sum, r) => sum + r.continuation, 0) / total;
  const falseSignalRate = results.filter(r => r.falseSignal).length / total;
  const sampleSizeBonus = Math.min(total / 30, 1);

  const speedScore = avgSpeed > 0 ? 1 / avgSpeed : 0;

  const finalScore = (
    hitRate * 100 * 0.25 +
    moveScore * 100 * 0.20 +
    rrScore * 100 * 0.15 +
    continuationScore * 100 * 0.10 +
    speedScore * 100 * 0.10 +
    moveScore * 100 * 0.10 - // volumeScore merged into moveScore
    falseSignalRate * 100 * 0.10
  );

  return {
    finalScore: Math.round(finalScore),
    hitRate: Math.round(hitRate * 100),
    rrScore: Math.round(rrScore * 100),
    speedScore: Math.round(speedScore * 100),
    moveScore: Math.round(moveScore * 100),
    continuationScore: Math.round(continuationScore * 100),
    falseSignalRate: Math.round(falseSignalRate * 100),
    sampleSizeBonus: Math.round(sampleSizeBonus * 100)
  };
}
