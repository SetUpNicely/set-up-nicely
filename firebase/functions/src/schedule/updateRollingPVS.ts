// 📁 /firebase/functions/src/updateRollingPVS.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { calculatePVSFromHistory } from '../calculatePVSFromHistory.js';
import { PVSResult } from '../calculatePVS.js';

const firestore = getFirestore();

export const updateRollingPVS = onSchedule(
  { schedule: 'every day 03:00', region: 'us-central1' },
  async () => {
    const oneYearAgo = Timestamp.fromDate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));

    // 🔁 Global PVS triggers under /pvsTriggers/{symbol}/{scanId}/{triggerDoc}
    const symbolDocs = await firestore.collection('pvsTriggers').listDocuments();

    for (const symbolDoc of symbolDocs) {
      const symbol = symbolDoc.id;
      const scanCollections = await symbolDoc.listCollections();

      for (const scanCol of scanCollections) {
        const scanId = scanCol.id;
        const snapshot = await scanCol.get();

        const triggers: PVSResult[] = snapshot.docs
          .map(doc => doc.data())
          .filter(t => (t.timestamp ?? 0) >= oneYearAgo.toMillis()) // ✅ Stored as UNIX timestamp (ms)
          .map(t => normalizeTrigger(t));

        if (triggers.length < 20) continue;

        const pvsScore = calculatePVSFromHistory(triggers);

        await firestore.collection('pvsScores').doc(`${scanId}_${symbol}`).set({
          symbol,
          scanId,
          pvsScore,
          updatedAt: Timestamp.now(),
          sampleSize: triggers.length,
        });
      }
    }

    // 🔁 Per-user custom scans: /users/{uid}/triggers/{doc}
    const usersSnap = await firestore.collection('users').get();

    for (const userDoc of usersSnap.docs) {
      const uid = userDoc.id;
      const role = userDoc.data().role ?? 'free';

      if (role !== 'pro') continue;

      const triggersRef = firestore.collection(`users/${uid}/triggers`);
      const triggerDocs = await triggersRef.get();

      const grouped: Record<string, PVSResult[]> = {};

      for (const doc of triggerDocs.docs) {
        const data = doc.data();
        if ((data.timestamp ?? 0) < oneYearAgo.toMillis()) continue;

        const key = data.scanId;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(normalizeTrigger(data));
      }

      for (const scanId of Object.keys(grouped)) {
        const triggers = grouped[scanId];
        if (triggers.length < 20) continue;

        const pvsScore = calculatePVSFromHistory(triggers);

        await firestore.doc(`users/${uid}/pvsScores/${scanId}`).set({
          score: pvsScore,
          updatedAt: Timestamp.now(),
          sampleSize: triggers.length,
        });
      }
    }

    console.log('✅ Rolling PVS scores updated.');
  }
);

// 🔧 Normalize raw trigger doc into PVSResult format
function normalizeTrigger(data: any): PVSResult {
  return {
    hit: !!data.hit,
    rrHit: !!data.rrHit,
    timeToTarget: data.timeToTarget ?? -1,
    volumeSpike: !!data.volumeSpike,
    continuation: data.continuation ?? 0,
    moveScore: data.moveScore ?? 0,
    falseSignal: !!data.falseSignal,
    pvsScore: data.pvsScore ?? 0,
    rrScore: data.rrScore ?? 0,
    speedScore: data.speedScore ?? 0,
    hitTarget: !!data.hitTarget,
    hitStop: !!data.hitStop,
    candlesUntilHit: data.candlesUntilHit ?? -1,
    maxDrawdownPercent: data.maxDrawdownPercent ?? 0,
    outcome: data.outcome ?? 'noMove',
  };
}
