// 📁 firebase/functions/src/runPresetScans.ts

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { firestore } from './firebase.js';
import { presetScans } from '../../../shared/data/presetScans.js';
import { calculateAllIndicators } from '../../../shared/engine/indicators/calculateAllIndicators.js';
import { evaluateScanLogic } from './evaluateScanLogic.js';
import { calculatePVS } from './calculatePVS.js';
import { fetchCandlesForScan } from './fetchCandlesForScan.js';
import { Timestamp } from 'firebase-admin/firestore';
import { Request, Response } from 'express';
import { Timeframe } from '../../../shared/data/Timeframe.js';

// 🔘 Optional manual trigger
export const runPresetScansHandler = async (_req: Request, res: Response) => {
  await runScansForAllUsers();
  res.status(200).send('✅ Manual scan run completed.');
};

// 🧠 Master scan runner for all users
async function runScansForAllUsers() {
  const symbolsToScan = ['AAPL', 'MSFT', 'TSLA', 'NVDA', 'AMD', 'GOOGL', 'META'];
  const usersSnap = await firestore.collection('users').get();

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;

    for (const symbol of symbolsToScan) {
      let candleMap;
      try {
        candleMap = await fetchCandlesForScan(symbol); // returns { '1m': [...], '5m': [...], ... }
        if (!candleMap['1m'] || candleMap['1m'].length < 100) continue;
      } catch (err) {
        console.error(`❌ Failed to fetch candles for ${symbol}:`, err);
        continue;
      }

      const groupedScans = groupScansByTimeframe(presetScans);

      for (const [timeframeStr, scans] of Object.entries(groupedScans)) {
        const timeframe = timeframeStr as Timeframe;
        const candles = candleMap[timeframe];
        if (!candles || candles.length < 50) continue;

        for (const scan of scans) {
          try {
            const indicators = calculateAllIndicators(candles);
            const match = evaluateScanLogic(scan.logic, indicators);

            if (match) {
              // 🧠 Calculate PVS
              const triggerIndex = candles.length - 21; // use last eligible candle
              const pvsScoreObj = await calculatePVS({
                scan,
                candles,
                triggerIndex,
                timeframe,
              });

              const triggerRef = firestore
                .collection(`users/${uid}/triggers`)
                .doc(`${scan.id}_${symbol}_${candles[candles.length - 1].timestamp}`);

              await triggerRef.set({
                scanId: scan.id,
                scanName: scan.name,
                symbol,
                timeframe,
                timestamp: candles[candles.length - 1].timestamp,
                pvsScore: pvsScoreObj.pvsScore,
                sectorHotToday: false, // optional: updated in separate sector tag logic
                confidenceScore: null, // optional: calculated if sectorHotToday is true
                createdAt: Timestamp.now(),
              });

              console.log(`✅ Match: ${scan.id} | ${symbol} | ${timeframe} | PVS: ${pvsScoreObj.pvsScore}`);
            }
          } catch (err) {
            console.error(`❌ Error running ${scan.id} on ${symbol} (${timeframe}):`, err);
          }
        }
      }
    }
  }
}

// 🧹 Utility: Group scans by timeframe
function groupScansByTimeframe(scans: typeof presetScans): Record<Timeframe, typeof presetScans> {
  return scans.reduce((acc, scan) => {
    const tf = scan.timeframe as Timeframe;
    if (!acc[tf]) acc[tf] = [];
    acc[tf].push(scan);
    return acc;
  }, {} as Record<Timeframe, typeof presetScans>);
}
