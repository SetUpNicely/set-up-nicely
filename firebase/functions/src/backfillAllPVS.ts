// 📁 /firebase/functions/src/backfillAllPVS.ts
import { CandleData } from '../../../shared/data/CandleData.js';
import { evaluateScanLogic } from './evaluateScanLogic.js';
import { calculatePVS, PVSResult } from './calculatePVS.js';
import { presetScans } from '../../../shared/data/presetScans.js';
import { calculateAllIndicators } from '../../../shared/engine/indicators/calculateAllIndicators.js';
import { fetchCandlesForScan } from './fetchCandlesForScan.js';
import { firestore } from './firebase.js';
import { Timestamp } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { storeTriggerMetadata } from './services/storeTriggerMetadata.js';
import { calculatePVSFromHistory } from './calculatePVSFromHistory.js';
import { Timeframe } from '../../../shared/data/Timeframe.js';

const POLYGON_API_KEY = defineSecret('POLYGON_API_KEY');
const topTickers = ['AAPL', 'TSLA', 'NVDA', 'AMD', 'MSFT', 'META'];

function getLookbackForwardWindow(timeframe: Timeframe): number {
  switch (timeframe) {
    case '1m': return 20;
    case '5m': return 20;
    case '15m': return 20;
    case '30m': return 15;
    case '1h': return 10;
    case '4h': return 6;
    case 'D': return 4;
    case 'W': return 2;
    default: return 20;
  }
}

export async function backfillAllPVS(apiKey: string) {
  const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000);

  const weekChunks: [number, number][] = [];
  for (let start = oneYearAgo; start < now; start += MS_PER_WEEK) {
    const fromMs = start;
    const toMs = Math.min(start + MS_PER_WEEK - 1, now);
    weekChunks.push([fromMs, toMs]);
  }

  for (const scan of presetScans) {
    const timeframe = scan.timeframe;
    console.log(`🔍 Starting scan: ${scan.name} (${scan.id}) on timeframe ${timeframe}`);

    for (const symbol of topTickers) {
      try {
        const allCandles: CandleData[] = [];

        for (const [fromMs, toMs] of weekChunks) {
          const result = await fetchCandlesForScan(symbol, timeframe, undefined, apiKey, fromMs, toMs);
          const candles = result[timeframe];
          console.log(`📦 Fetched ${candles?.length || 0} candles for ${symbol} ${timeframe} from ${new Date(fromMs).toISOString()} to ${new Date(toMs).toISOString()}`);
          if (candles && candles.length) {
            allCandles.push(...candles);
          }
        }

        console.log(`📊 Total candles fetched for ${symbol} ${scan.id}: ${allCandles.length}`);
        if (allCandles.length < 50) {
          console.warn(`⚠️ Skipping ${symbol} ${scan.id}: not enough candles (${allCandles.length})`);
          continue;
        }

        allCandles.sort((a, b) => a.timestamp - b.timestamp);
        const uniqueCandles = allCandles.filter((c, i, arr) => i === 0 || c.timestamp !== arr[i - 1].timestamp);
        console.log(`✅ ${uniqueCandles.length} unique candles after deduplication`);

        const skip = getLookbackForwardWindow(timeframe);
        const triggers: PVSResult[] = [];

        for (let i = skip; i < uniqueCandles.length - skip; i++) {
          const indicators = calculateAllIndicators(uniqueCandles, i);
          const triggered = evaluateScanLogic(scan.logic, indicators);

          if (triggered) {
            console.log(`🔥 Trigger MATCHED at index ${i} for ${symbol} ${scan.id}`);
            const pvsResult = await calculatePVS({
              scan,
              candles: uniqueCandles,
              triggerIndex: i,
              timeframe,
            });

            triggers.push(pvsResult);

            await storeTriggerMetadata({
              scanId: scan.id,
              symbol,
              timeframe,
              timestamp: uniqueCandles[i].timestamp,
              direction: scan.direction,
              triggered: true,
              evaluatedAt: Date.now(),
              moveScore: pvsResult.moveScore,
              hitTarget: pvsResult.hitTarget ?? pvsResult.hit,
              hitStop: pvsResult.hitStop ?? false,
              candlesUntilHit: pvsResult.candlesUntilHit ?? pvsResult.timeToTarget,
              maxDrawdownPercent: pvsResult.maxDrawdownPercent ?? 0,
              rrScore: pvsResult.rrScore ?? 0,
              speedScore: pvsResult.speedScore ?? 0,
              volumeSpike: pvsResult.volumeSpike ?? false,
              continuation: pvsResult.continuation ?? 0,
              falseSignal: pvsResult.falseSignal ?? false,
              pvsScore: pvsResult.pvsScore,
            });
          } else {
            console.log(`— No trigger at index ${i} for ${symbol} ${scan.id}`);
          }
        }

        const avgScore = calculatePVSFromHistory(triggers);

        await firestore.collection('pvsScores').doc(`${scan.id}_${symbol}`).set({
          pvsScore: avgScore,
          scanId: scan.id,
          symbol,
          lastUpdated: Timestamp.now(),
        });

        console.log(`✅ DONE ${scan.id} ${symbol}: PVS ${avgScore.toFixed(1)} from ${triggers.length} triggers`);

      } catch (err) {
        console.error(`❌ Error backfilling ${scan.id} ${symbol}`, err);
      }
    }
  }
}

export const backfillAllPVSFunction = onRequest(
  {
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: [POLYGON_API_KEY],
  },
  async (_req, res) => {
    await backfillAllPVS(POLYGON_API_KEY.value());
    res.status(200).send('✅ Backfill + Metadata Complete');
  }
);
