// 📍 /firebase/functions/src/services/storeTriggerStub.ts
import { getFirestore } from 'firebase-admin/firestore';

export interface TriggerStub {
  scanId: string;
  symbol: string;
  timeframe: string;
  timestamp: number; // ms
  triggered: true;
  evaluatedAt: number; // ms
  direction?: 'bullish' | 'bearish';
}

export async function storeTriggerStub(data: TriggerStub): Promise<void> {
  const db = getFirestore();
  const { symbol, scanId } = data;
  const tsSec = Math.floor(data.timestamp / 1000);

  const ref = db
    .collection('pvsTriggers')
    .doc(symbol)
    .collection(scanId)
    .doc(tsSec.toString());

  await ref.set(
    {
      ...data,
      timestamp: tsSec,
    },
    { merge: true }
  );
}
