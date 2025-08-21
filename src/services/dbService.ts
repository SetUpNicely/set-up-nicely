// 📁 Location: /src/services/dbService.ts

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  limit,
  orderBy,
  DocumentData,
} from 'firebase/firestore';
import { firestore } from '@services/firebase';
import { updatePVSHistoryAndRecalculate } from './pvsService';
import { PVSResult } from '../../firebase/functions/src/calculatePVS';
import { Timeframe } from '@shared/data/Timeframe';

// 🔹 Type Definitions
interface JournalEntry {
  id?: string;
  createdAt: number;
  [key: string]: any;
}

interface UserScan {
  id: string;
  name: string;
  description?: string;
  timeframe: Timeframe;
  logic: Record<string, any>;
  direction?: 'bullish' | 'bearish';
  createdBy: string;
}

// 🔹 User Document Functions
const dbService = {
  async getUser(uid: string): Promise<DocumentData | null> {
    const ref = doc(firestore, 'users', uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  },

  async setUser(uid: string, data: Record<string, any>): Promise<void> {
    const ref = doc(firestore, 'users', uid);
    await setDoc(ref, data, { merge: true });
  },

  // 🔹 Journal Functions
  async addJournalEntry(uid: string, entry: JournalEntry): Promise<void> {
    const ref = collection(firestore, 'users', uid, 'journal');
    await addDoc(ref, entry);
  },

  async getJournalEntries(uid: string, max = 10): Promise<JournalEntry[]> {
    const ref = collection(firestore, 'users', uid, 'journal');
    const q = query(ref, orderBy('createdAt', 'desc'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as JournalEntry));
  },

  async deleteJournalEntry(uid: string, entryId: string): Promise<void> {
    const ref = doc(firestore, 'users', uid, 'journal', entryId);
    await deleteDoc(ref);
  },

  // 🔹 Custom Scan Save
  async saveUserScan(scan: UserScan): Promise<void> {
    const ref = doc(firestore, 'users', scan.createdBy, 'customScans', scan.id);
    await setDoc(ref, scan, { merge: true });
  },
};

// 🔹 Trigger Save (Per user + scan + symbol + timestamp)
export async function saveTriggerToFirestore({
  uid,
  symbol,
  scanId,
  timestamp,
  timeframe,
  pvsScore,
  pvsComponents,
  isCustomScan = false,
}: {
  uid: string;
  symbol: string;
  scanId: string;
  timestamp: number;
  timeframe: string;
  pvsScore: number;
  pvsComponents: PVSResult;
  isCustomScan?: boolean;
}): Promise<void> {
  const ref = doc(firestore, `users/${uid}/triggers/${scanId}_${symbol}_${timestamp}`);
  await setDoc(ref, {
    symbol,
    scanId,
    timestamp,
    timeframe,
    triggered: true,
    ...pvsComponents, // Includes pvsScore already
  });

  if (isCustomScan) {
    await updatePVSHistoryAndRecalculate({
      uid,
      scanId,
      symbol,
      timestamp,
      timeframe: timeframe as Timeframe,
      pvsScore,
      pvsComponents,
    });
  }
}


// 🔹 PVS Score Getters

export async function getPVSScore(scanKey: string): Promise<number | null> {
  const ref = doc(firestore, `pvs/${scanKey}`);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    return typeof data.pvsScore === 'number' ? data.pvsScore : null;
  }
  return null;
}

export async function getUserPVSScore(uid: string, scanId: string): Promise<number | null> {
  const ref = doc(firestore, `users/${uid}/pvsScores/${scanId}`);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    return typeof data.score === 'number' ? data.score : null;
  }
  return null;
}

export async function getEffectivePVSScore({
  scanId,
  symbol,
  uid,
  isCustom,
}: {
  scanId: string;
  symbol?: string;
  uid: string;
  isCustom: boolean;
}): Promise<number | null> {
  if (isCustom) {
    return getUserPVSScore(uid, scanId);
  } else if (symbol) {
    return getPVSScore(`${scanId}_${symbol}`);
  }
  return null;
}

// 🔹 Journal Limit Check
export async function checkJournalLimit(uid: string, max = 10): Promise<boolean> {
  const ref = collection(firestore, 'users', uid, 'journal');
  const q = query(ref, orderBy('createdAt', 'desc'), limit(max));
  const snap = await getDocs(q);
  return snap.docs.length >= max;
}

// 🔹 User Scan Results Viewer
export async function getUserScanResults(uid: string): Promise<any[]> {
  const ref = collection(firestore, 'users', uid, 'scanResults');
  const snap = await getDocs(ref);
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export { dbService };
