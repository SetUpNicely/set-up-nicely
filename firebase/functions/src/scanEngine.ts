import { CandleData } from '../../../shared/data/CandleData.js';
import { PresetScanDefinition } from '../../../shared/data/presetScans.js';
import { calculateAllIndicators } from '../../../shared/engine/indicators/calculateAllIndicators.js';
import { evaluateScanLogic } from './evaluateScanLogic.js';
import { TriggerResult } from '../../../shared/data/TriggerResult.js';
import { calculatePVS } from './calculatePVS.js';

const LOOKAHEAD = 20;

interface ScanTriggerMatch {
  index: number;
  candle: CandleData;
  trigger: TriggerResult;
}

/**
 * Runs a scan definition across a candle history.
 * Returns a list of matching candles and trigger metadata.
 */
export async function runScanEngine(
  scan: PresetScanDefinition,
  candles: CandleData[]
): Promise<ScanTriggerMatch[]> {
  const results: ScanTriggerMatch[] = [];

  for (let i = 1; i < candles.length - LOOKAHEAD; i++) {
    const indicators = calculateAllIndicators(candles, i);
    const matches = evaluateScanLogic(scan.logic, indicators);

    if (matches) {
      const currentClose = candles[i].close;
      const targetMove = currentClose * 0.03;
      const stopLossMove = currentClose * 0.015;
      const lookahead = candles.slice(i + 1, i + 1 + LOOKAHEAD);

      let hit = false;
      let rrHit = false;
      let continuation = 0;
      let timeToTarget = -1;
      let falseSignal = false;

      for (let j = 0; j < lookahead.length; j++) {
        const hi = lookahead[j].high;
        const lo = lookahead[j].low;
        const pctGain = (hi - currentClose) / currentClose;

        if (!hit && hi >= currentClose + targetMove) {
          hit = true;
          timeToTarget = j + 1;
        }

        if (!rrHit && hi >= currentClose + targetMove && lo <= currentClose - stopLossMove) {
          rrHit = true;
        }

        if (pctGain > continuation) {
          continuation = pctGain;
        }

        if (!hit && lo <= currentClose - stopLossMove) {
          falseSignal = true;
          break;
        }
      }

      const moveScore = +(Math.min(continuation / 0.03, 1) * 100).toFixed(2);
      const continuationPct = +(continuation * 100).toFixed(2);
      const volumeSpike = candles[i].volume > candles[i - 1]?.volume * 1.5 || false;

      const rawTrigger = {
        hit,
        rrHit,
        timeToTarget,
        volumeSpike,
        continuation: continuationPct,
        moveScore,
        falseSignal,
      };

      
      const pvsResult = await calculatePVS({
        scan,
        candles,
        triggerIndex: i,
        timeframe: scan.timeframe, // ✅ assuming your scan object includes a timeframe property
      });


      const trigger: TriggerResult = {
        ...rawTrigger,
        pvsScore: pvsResult.pvsScore,
      };

      results.push({
        index: i,
        candle: candles[i],
        trigger,
      });
    }
  }

  return results;
}
