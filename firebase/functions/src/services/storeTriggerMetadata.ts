// 📁 /firebase/functions/src/services/storeTriggerMetadata.ts
import { getFirestore } from 'firebase-admin/firestore';

export interface TriggerMetadata {
  scanId: string;
  symbol: string;
  timeframe: string;
  timestamp: number; // UNIX timestamp in seconds
  direction: 'bullish' | 'bearish';
  triggered: true;
  evaluatedAt: number; // in ms

  // PVS Component Data
  moveScore: number;
  hitTarget: boolean;
  hitStop: boolean;
  candlesUntilHit: number;
  maxDrawdownPercent: number;
  rrScore: number;
  speedScore: number;
  volumeSpike?: boolean;
  continuation: number;
  falseSignal: boolean;
  pvsScore: number;

  sectorHotToday?: boolean;

  // Custom scan metadata
  isCustom?: boolean;
  userId?: string;
}

export async function storeTriggerMetadata(data: TriggerMetadata): Promise<void> {
  const db = getFirestore();
  const { symbol, scanId, isCustom, userId } = data;

  const tsSec = data.timestamp > 1e12 ? Math.floor(data.timestamp / 1000) : data.timestamp;

  let docRef;

  if (isCustom && userId) {
    // 🔒 Custom scan → user-specific location
    docRef = db
      .collection('users')
      .doc(userId)
      .collection('customTriggers')
      .doc(`${symbol}_${scanId}_${tsSec}`);
  } else {
    // 🔒 Preset scan → global location
    docRef = db
      .collection('pvsTriggers')
      .doc(symbol)
      .collection(scanId)
      .doc(tsSec.toString());
  }

  await docRef.set(
    {
      ...data,
      timestamp: tsSec,
    },
    { merge: true }
  );
}
