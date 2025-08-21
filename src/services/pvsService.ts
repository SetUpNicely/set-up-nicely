// 📁 /src/services/pvsService.ts

import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { Timeframe } from '@shared/data/Timeframe';
import { PVSResult } from '../../firebase/functions/src/calculatePVS';

interface UpdateUserPVSInput {
  uid: string;
  scanId: string;
  symbol: string;
  timestamp: number;
  timeframe: Timeframe;
  pvsScore: number;
  pvsComponents: PVSResult;
}

/**
 * Saves the user's PVS result for a custom scan and updates the rolling summary.
 */
export async function updatePVSHistoryAndRecalculate({
  uid,
  scanId,
  symbol,
  timestamp,
  pvsScore,
  timeframe,
  pvsComponents,
}: UpdateUserPVSInput) {
  const userPVSRef = doc(firestore, 'users', uid, 'customPVS', scanId);
  const resultRef = doc(collection(userPVSRef, 'results'), timestamp.toString());

  await setDoc(resultRef, {
    symbol,
    timestamp,
    timeframe,
    ...pvsComponents,
    pvsScore,
  });

  const resultsQuery = query(
    collection(userPVSRef, 'results'),
    orderBy('timestamp', 'desc'),
    limit(100)
  );

  const snapshot = await getDocs(resultsQuery);
  const triggers = snapshot.docs.map((doc) => doc.data() as any);

  const avg = (nums: number[]) =>
    nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;

  const hitRate = avg(triggers.map((t) => t.hit ? 1 : 0));
  const falseRate = avg(triggers.map((t) => t.falseSignal ? 1 : 0));
  const moveScore = avg(triggers.map((t) => t.moveScore || 0));
  const averagePVS = avg(triggers.map((t) => t.pvsScore || 0));

  const summaryRef = doc(collection(userPVSRef, 'summary'), 'overview');
  await setDoc(summaryRef, {
    averagePVS: Math.round(averagePVS),
    sampleSize: triggers.length,
    hitRate,
    falseSignalRate: falseRate,
    moveScore,
    updatedAt: Timestamp.now(),
  });

  console.log(`✅ User PVS updated: ${uid} / ${scanId}`);
}
