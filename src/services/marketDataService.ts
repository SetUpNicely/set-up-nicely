
// 📁 /src/services/marketDataService.ts
import { CandleData } from '@shared/data/CandleData';
import { Timeframe } from '@shared/data/Timeframe';
import { getFirebaseFunctions } from './firebase'; // Lazy loader from your firebase.ts

// 🔁 Helper to call Firebase Functions lazily
async function callFunction<T = any>(
  name: string,
  payload: object
): Promise<T> {
  const { httpsCallable } = await import('firebase/functions');
  const functions = await getFirebaseFunctions();
  const fn = httpsCallable(functions, name);
  const result = await fn(payload);
  return result.data as T;
}

// 🔽 Fetch only 1m candles
export async function fetchCandles(symbol: string): Promise<CandleData[]> {
  const data = await callFunction<Record<Timeframe, CandleData[]>>('getCandles', { symbol });
  return data['1m'];
}

// 🔁 Fetch all timeframes (pre-aggregated backend logic)
export async function fetchAllTimeframes(symbol: string): Promise<Record<Timeframe, CandleData[]>> {
  return await callFunction<Record<Timeframe, CandleData[]>>('getCandles', { symbol });
}
