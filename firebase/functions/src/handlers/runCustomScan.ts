// 📁 /firebase/functions/src/handlers/runCustomScan.ts
import { https } from 'firebase-functions/v2';
import { onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { CustomScanDefinition, ScanMatchResult } from '../../../../shared/data/ScanTypes.js';
import { fetchCandlesFromPolygon } from '../utils/fetchCandlesFromPolygon.js';
import { aggregateCandles } from '../utils/aggregatedCandles.js';
import { calculateAllIndicators } from '../../../../shared/engine/indicators/calculateAllIndicators.js';
import { evaluateScanLogic } from '../evaluateScanLogic.js';
import { Timeframe } from '../../../../shared/data/Timeframe.js';
import { CandleData } from '../../../../shared/data/CandleData.js';
import { getTimeRangeForTimeframe } from '../utils/getTimeRangeForTimeframe.js';
import { storeTriggerMetadata } from '../services/storeTriggerMetadata.js';

const POLYGON_API_KEY = defineSecret('POLYGON_API_KEY');

export const runCustomScan = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 30,
    cors: true,
    secrets: [POLYGON_API_KEY],
  },
  async (req): Promise<ScanMatchResult[]> => {
    const { scan, tickers, uid } = req.data as {
      scan: CustomScanDefinition;
      tickers: string[];
      uid?: string;
    };

    if (!scan || !tickers?.length) {
      throw new https.HttpsError('invalid-argument', 'Missing scan or tickers input.');
    }

    const matches: ScanMatchResult[] = [];

    for (const symbol of tickers) {
      try {
        const { from, to } = getTimeRangeForTimeframe(scan.timeframe, 'light');
        const baseCandles = await fetchCandlesFromPolygon(symbol, from, to);

        if (!baseCandles?.length) {
          console.warn(`⚠️ No base candles for ${symbol}`);
          continue;
        }

        const allCandles = aggregateCandles(baseCandles);
        let candles: CandleData[] | undefined =
          scan.timeframe === '1m'
            ? baseCandles
            : allCandles[scan.timeframe as Exclude<Timeframe, '1m'>];

        if (!candles || candles.length < 50) {
          console.warn(`⚠️ Not enough candles for ${symbol} (${scan.timeframe})`);
          continue;
        }

        for (let i = 20; i < candles.length; i++) {
          const indicators = calculateAllIndicators(candles, i);
          const triggered = evaluateScanLogic(scan.logic, indicators);

          if (triggered) {
            const ts = Math.floor(candles[i].timestamp / 1000);

            matches.push({
              symbol,
              scanId: scan.id,
              scanName: scan.name,
              timeframe: scan.timeframe,
              timestamp: ts,
              triggered: true,
              direction: scan.direction ?? 'bullish',
              pvsScore: 0,
              confidenceScore: 0,
              sectorHotToday: false,
            });

            // ✅ Store metadata (to Firestore)
            if (uid) {
              await storeTriggerMetadata({
                scanId: scan.id,
                symbol,
                timeframe: scan.timeframe,
                timestamp: candles[i].timestamp,
                direction: scan.direction ?? 'bullish',
                triggered: true,
                evaluatedAt: Date.now(),
                moveScore: 0,
                hitTarget: false,
                hitStop: false,
                candlesUntilHit: -1,
                maxDrawdownPercent: 0,
                rrScore: 0,
                speedScore: 0,
                volumeSpike: indicators.volumeSpike ?? false,
                continuation: 0,
                falseSignal: false,
                pvsScore: 0,
                isCustom: true,
                userId: uid,
              });
            }

            break; // only first trigger per symbol
          }
        }
      } catch (err) {
        console.error(`❌ Error scanning ${symbol}`, err);
      }
    }

    return matches;
  }
);
