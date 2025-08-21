// 📁 /firebase/functions/src/services/firestoreTriggers.ts

import { firestore } from '../firebase.js'; // Make sure this exports the initialized Firestore admin instance

export interface TriggerDoc {
  timestamp: number;
  movePercent: number;
  maxDrawdownPercent: number;
  hitTarget: boolean;
  falseSignal: boolean;
  volumeSpike?: boolean;
  candlesUntilHit: number;
}

export async function getRollingTriggerData(symbol: string, scanId: string, days: number = 365): Promise<TriggerDoc[]> {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const colRef = firestore.collection('pvsTriggers').doc(symbol).collection(scanId);
  const snap = await colRef.orderBy('timestamp').get();

  const results: TriggerDoc[] = [];

  for (const doc of snap.docs) {
    const data = doc.data() as TriggerDoc;
    if (data.timestamp >= cutoff) {
      results.push(data);
    } else {
      // Prune old trigger
      await doc.ref.delete();
    }
  }

  return results;
}
