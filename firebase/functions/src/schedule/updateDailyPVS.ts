// 📁 /firebase/functions/src/updateDailyPVS.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { calculatePVS, PVSResult } from '../calculatePVS.js';
import { presetScans } from '../../../../shared/data/presetScans.js';
import { fetchCandlesForScan } from '../fetchCandlesForScan.js';
import { updateAvgTickerPVS } from '../utils/updateAvgTickerPVS.js';
import { Timeframe } from '../../../../shared/data/Timeframe.js';

const firestore = getFirestore();

export const updateDailyPVS = onSchedule(
  { schedule: 'every day 03:30', region: 'us-central1' },
  async () => {
    const dateStr = new Date().toISOString().split('T')[0];

    const scanResults: Record<
      string,
      {
        triggers: Record<string, PVSResult>;
        pvsTotal: number;
        count: number;
      }
    > = {};

    // 🆕 Get all ticker symbols from /pvsTriggers
    const tickersSnap = await firestore.collection('pvsTriggers').listDocuments();
    const tickerIds = tickersSnap.map(doc => doc.id);

    for (const scan of presetScans) {
      const { id: scanId, timeframe } = scan;

      for (const ticker of tickerIds) {
        const triggerRef = firestore
          .collection('pvsTriggers')
          .doc(ticker)
          .collection(scanId);

        const snapshot = await triggerRef
          .where('pvsScored', '==', false)
          .get();

        if (snapshot.empty) continue;

        const result = await fetchCandlesForScan(ticker, timeframe);
        const candles = result?.[timeframe] ?? [];

        if (!candles.length) {
          console.warn(`⚠️ No candles found for ${ticker} (${scanId})`);
          continue;
        }

        for (const doc of snapshot.docs) {
          const data = doc.data();
          const triggerIndex = data.triggerIndex;
          const timestamp = data.timestamp;

          if (!timestamp) {
            console.warn(`⛔ Missing timestamp in doc ${doc.id}`);
            continue;
          }

          // Defensive: find matching candle
          let validIndex = -1;

          if (
            typeof triggerIndex === 'number' &&
            candles[triggerIndex]?.timestamp === timestamp
          ) {
            validIndex = triggerIndex;
          } else {
            const fallback = candles.findIndex((c) => c.timestamp === timestamp);
            if (fallback !== -1) validIndex = fallback;
          }

          if (validIndex === -1) {
            console.warn(`⚠️ No matching candle for ${ticker} ${scanId} @ ${timestamp}`);
            continue;
          }

          try {
            const pvs = await calculatePVS({
              scan,
              candles,
              triggerIndex: validIndex,
              timeframe: timeframe as Timeframe,
            });

            if (!scanResults[scanId]) {
              scanResults[scanId] = {
                triggers: {},
                pvsTotal: 0,
                count: 0,
              };
            }

            scanResults[scanId].triggers[ticker] = pvs;
            scanResults[scanId].pvsTotal += pvs.pvsScore;
            scanResults[scanId].count += 1;

            await updateAvgTickerPVS({ scanId, ticker, newScore: pvs.pvsScore });
            await doc.ref.update({ pvsScored: true });

          } catch (err) {
            console.error(`❌ Failed scoring PVS for ${ticker} on ${scanId}`, err);
          }
        }
      }
    }

    for (const scanId of Object.keys(scanResults)) {
      const { triggers, pvsTotal, count } = scanResults[scanId];
      const avg = count > 0 ? Math.round(pvsTotal / count) : 0;

      await firestore
        .collection('pvsDailyResults')
        .doc(dateStr)
        .collection('scans')
        .doc(scanId)
        .set({
          averagePVS: avg,
          triggers,
          updatedAt: Timestamp.now(),
        });
    }

    console.log('✅ updateDailyPVS complete');
  }
);
