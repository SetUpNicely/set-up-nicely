import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { firestore } from './firebase.js';
import { Timestamp } from 'firebase-admin/firestore';
import { presetScans } from '../../../shared/data/presetScans.js';
import { Timeframe } from '../../../shared/data/Timeframe.js';
import { fetchCandlesForScan } from './fetchCandlesForScan.js';
import { evaluateScanLogic } from './evaluateScanLogic.js';
import { calculateAllIndicators } from '../../../shared/engine/indicators/calculateAllIndicators.js';
import { sendNotification } from './sendNotification.js';

const POLYGON_API_KEY = defineSecret('POLYGON_API_KEY');

export const notifyWatchlist = onSchedule(
  {
    schedule: 'every 30 minutes',
    region: 'us-central1',
    secrets: [POLYGON_API_KEY],
  },
  async () => {
    const apiKey = POLYGON_API_KEY.value();
    const usersSnap = await firestore.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const userData = userDoc.data();

      const settings = userData.userSettings ?? {};
      const token = userData.fcmToken;
      const alertsEnabled = settings.alertsEnabled ?? true;
      const alertFrequency: 'low' | 'normal' | 'high' = settings.alertFrequency ?? 'normal';

      if (!alertsEnabled || !token) {
        console.warn(`🔕 Skipping ${uid} — alerts disabled or no token`);
        continue;
      }

      const throttleMS = alertFrequency === 'low'
        ? 1000 * 60 * 60 * 24
        : alertFrequency === 'normal'
          ? 1000 * 60 * 60
          : 0;

      if (throttleMS > 0) {
        const lastAlert: Timestamp | undefined = userData.lastWatchlistAlert;
        if (lastAlert && Date.now() - lastAlert.toMillis() < throttleMS) {
          console.log(`⏳ Skipping ${uid} — throttled based on ${alertFrequency}`);
          continue;
        }
      }

      const watchlistSnap = await firestore.collection(`users/${uid}/watchlist`).get();
      const watchlist = watchlistSnap.docs.map((doc) => doc.data().symbol);

      let alertSent = false;

      for (const symbol of watchlist) {
        for (const scan of presetScans) {
          try {
            const lookback = getDefaultLookbackMinutes(scan.timeframe as Timeframe);
            const candleMap = await fetchCandlesForScan(symbol, scan.timeframe as Timeframe, lookback, apiKey); // ✅ pass key
            const candles = candleMap[scan.timeframe as Timeframe];

            if (!candles || candles.length < 21) continue;

            const i = candles.length - 2;
            const indicators = calculateAllIndicators(candles, i);
            const triggered = evaluateScanLogic(scan.logic, indicators);

            if (triggered) {
              const title = '📈 Watchlist Alert Triggered';
              const body = `${symbol} triggered ${scan.name}`;

              await sendNotification(token, title, body, {
                symbol,
                scanId: scan.id,
                scanName: scan.name,
                timeframe: scan.timeframe,
                route: '/journal',
                triggerTime: candles[i].timestamp.toString(),
              });

              console.log(`🔔 Notified ${uid} → ${symbol} (${scan.id})`);
              alertSent = true;
              break;
            }
          } catch (err) {
            console.error(`❌ Notify error for ${symbol} / ${scan.id}:`, err);
          }
        }
      }

      if (alertSent && throttleMS > 0) {
        await firestore.doc(`users/${uid}`).update({
          lastWatchlistAlert: Timestamp.now(),
        });
      }
    }
  }
);

// ⏱ Smart lookback window based on scan timeframe.
function getDefaultLookbackMinutes(timeframe: Timeframe): number {
  switch (timeframe) {
    case '1m': return 30;
    case '5m': return 120;
    case '15m': return 360;
    case '30m': return 720;
    case '1h': return 1440;
    case '4h': return 2880;
    case 'D': return 1440 * 7;
    case 'W': return 1440 * 30;
    default: return 60;
  }
}
