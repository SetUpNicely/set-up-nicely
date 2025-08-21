// 📁 /src/services/getScanAvgPVS.ts
import { doc, getDoc } from 'firebase/firestore';
import { firestore } from './firebase';

/**
 * Get average PVS for a scan.
 * If `dateStr` is provided, fetch from `/pvsDailyResults/{date}/scans/{scanId}`
 * Otherwise, fetch long-term average from `/pvsScanSummary/{scanId}`
 */
export async function getScanAvgPVS(scanId: string, dateStr?: string): Promise<number | null> {
  try {
    const ref = dateStr
      ? doc(firestore, 'pvsDailyResults', dateStr, 'scans', scanId)
      : doc(firestore, 'pvsScanSummary', scanId);

    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data().averagePVS ?? null;
    }
    return null;
  } catch (err) {
    console.error('Failed to fetch scan avg PVS:', err);
    return null;
  }
}
