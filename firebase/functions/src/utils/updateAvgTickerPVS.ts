import { firestore } from '../firebase.js'; // ✅ correct relative import
import { Timestamp } from 'firebase-admin/firestore';

export async function updateAvgTickerPVS({
  scanId,
  ticker,
  newScore,
}: {
  scanId: string;
  ticker: string;
  newScore: number;
}): Promise<void> {
  const docRef = firestore.doc(`pvsScores/${scanId}/${ticker}`);
  const docSnap = await docRef.get();

  let avg = 0;
  let count = 0;

  if (docSnap.exists) {
    const data = docSnap.data() ?? {};
    avg = typeof data.avgPVS === 'number' ? data.avgPVS : 0;
    count = typeof data.count === 'number' ? data.count : 0;
  }

  const updatedCount = count + 1;
  const updatedAvg = (avg * count + newScore) / updatedCount;

  await docRef.set(
    {
      ticker,
      scanId,
      avgPVS: Math.round(updatedAvg),
      count: updatedCount,
      updatedAt: Timestamp.now(),
    },
    { merge: true }
  );
}
