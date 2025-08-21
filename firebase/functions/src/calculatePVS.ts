// 📁 /firebase/functions/src/calculatePVS.ts

import { PresetScanDefinition } from '../../../shared/data/presetScans.js';
import { CandleData } from '../../../shared/data/CandleData.js';
import { expectedMoves } from '../../../shared/logic/expectedMoves.js';
import { Timeframe } from '../../../shared/data/Timeframe.js';
import { calculateAllIndicators } from '../../../shared/engine/indicators/calculateAllIndicators.js';

export interface PVSResult {
  hit: boolean;
  rrHit: boolean;
  timeToTarget: number;
  moveScore: number;
  rrScore: number;
  speedScore: number;
  volumeSpike: boolean;
  continuation: number;
  falseSignal: boolean;
  pvsScore: number;

  // 🆕 Additional fields
  hitTarget?: boolean;
  hitStop?: boolean;
  candlesUntilHit?: number;
  maxDrawdownPercent?: number;
  outcome: 'targetHit' | 'stopped' | 'partial' | 'noMove';
  confidenceScore?: number;
  sectorStrength?: number;
}

export async function calculatePVS({
  scan,
  candles,
  triggerIndex,
  timeframe,
  sectorStrength,
}: {
  scan: PresetScanDefinition;
  candles: CandleData[];
  triggerIndex: number;
  timeframe: Timeframe;
  sectorStrength?: number;
}): Promise<PVSResult> {
  const current = candles[triggerIndex];
  const direction = scan.direction ?? 'bullish';
  const entry = current.close;

  const expectedMove = expectedMoves[timeframe];
  const target = direction === 'bullish' ? entry * (1 + expectedMove) : entry * (1 - expectedMove);
  const stop = direction === 'bullish' ? entry * 0.995 : entry * 1.005;
  const rrTarget = direction === 'bullish'
    ? entry + (entry - stop) * 2
    : entry - (stop - entry) * 2;

  const lookaheadMap: Record<Timeframe, number> = {
    '1m': 20,
    '5m': 20,
    '15m': 15,
    '30m': 10,
    '1h': 8,
    '4h': 5,
    'D': 4,
    'W': 2,
  };
  const lookaheadLength = lookaheadMap[timeframe] ?? 20;
  const lookahead = candles.slice(triggerIndex + 1, triggerIndex + 1 + lookaheadLength);

  let hit = false;
  let rrHit = false;
  let stopHit = false;
  let timeToTarget = 0;
  let maxDrawdown = 0;

  for (let i = 0; i < lookahead.length; i++) {
    const c = lookahead[i];
    const high = direction === 'bullish' ? c.high : c.low;
    const low = direction === 'bullish' ? c.low : c.high;

    const targetHit = direction === 'bullish' ? high >= target : low <= target;
    const rrTargetHit = direction === 'bullish' ? high >= rrTarget : low <= rrTarget;
    const stopHitHere = direction === 'bullish' ? low <= stop : high >= stop;

    const drawdown = direction === 'bullish'
      ? (entry - low) / entry
      : (high - entry) / entry;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    if (!hit && targetHit) {
      hit = true;
      timeToTarget = i + 1;
    }

    if (rrTargetHit) rrHit = true;
    if (!hit && stopHitHere) stopHit = true;
  }

  const falseSignal = !hit && stopHit;

  const movePercent = direction === 'bullish'
    ? (Math.max(...lookahead.map(c => c.high)) - entry) / entry
    : (entry - Math.min(...lookahead.map(c => c.low))) / entry;
  const moveScore = Math.min(movePercent / expectedMove, 1) * 100;

  const rrRatio = expectedMove / (maxDrawdown || 0.0001);
  const rrScore = rrRatio <= 1
    ? 20
    : rrRatio >= 4
      ? 100
      : 20 + ((rrRatio - 1) / 3) * 80;

  const speedScore = falseSignal
    ? 0
    : !hit
      ? 20
      : 20 + 80 * ((lookaheadLength - timeToTarget) / lookaheadLength);

  const follow = candles.slice(triggerIndex + 1, triggerIndex + 4);
  const continuation = follow.length === 3 &&
    follow[0].high < follow[1].high &&
    follow[1].high < follow[2].high &&
    follow[0].low < follow[1].low &&
    follow[1].low < follow[2].low
    ? 1
    : 0;

  const avgVol = candles
    .slice(Math.max(0, triggerIndex - 10), triggerIndex)
    .reduce((acc, c) => acc + c.volume, 0) / 10;
  const volumeSpike = current.volume > avgVol * 1.5;

  const pvsScore =
    0.25 * (hit ? 100 : 0) +
    0.2 * moveScore +
    0.15 * rrScore +
    0.1 * speedScore +
    0.1 * (volumeSpike ? 100 : 0) +
    0.05 * (continuation * 100) -
    0.1 * (falseSignal ? 100 : 0);

  const finalScore = Math.round(Math.max(0, Math.min(100, pvsScore)));

  let outcome: 'targetHit' | 'stopped' | 'partial' | 'noMove' = 'noMove';
  if (hit) outcome = stopHit ? 'partial' : 'targetHit';
  else if (stopHit) outcome = 'stopped';

  let confidenceScore: number | undefined = undefined;
  if (typeof sectorStrength === 'number') {
    const normalizedSector = Math.max(-5, Math.min(5, sectorStrength)); // Clamp to ±5%
    const sectorScore = ((normalizedSector + 5) / 10) * 100;
    confidenceScore = 0.7 * finalScore + 0.3 * sectorScore;
  }

  return {
    hit,
    rrHit,
    timeToTarget,
    moveScore,
    rrScore,
    speedScore,
    volumeSpike,
    continuation,
    falseSignal,
    pvsScore: finalScore,
    hitTarget: hit,
    hitStop: stopHit,
    candlesUntilHit: timeToTarget,
    maxDrawdownPercent: maxDrawdown * 100,
    outcome,
    confidenceScore,
    sectorStrength,
  };
}
