import { doc, getDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import { PVSResult } from '../../firebase/functions/src/calculatePVS';

/**
 * Fetches the latest PVS metadata for a specific ticker on a given scanId and date.
 * @param scanId - ID of the preset scan
 * @param ticker - Stock symbol (e.g. 'AAPL')
 * @param dateStr - ISO date string (e.g. '2025-07-29')
 */
export async function getTickerPVS(
  scanId: string,
  ticker: string,
  dateStr: string
): Promise<PVSResult | null> {
  try {
    const scanDocRef = doc(firestore, 'pvsDailyResults', dateStr, 'scans', scanId);
    const snapshot = await getDoc(scanDocRef);

    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data?.triggers?.[ticker]) {
        return data.triggers[ticker] as PVSResult;
      }
    }

    return null;
  } catch (error) {
    console.error(`❌ Failed to fetch PVS result for ${ticker} on ${scanId}`, error);
    return null;
  }
}
