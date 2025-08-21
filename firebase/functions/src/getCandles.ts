// 📁 firebase/functions/src/getCandles.ts
import { onCall } from 'firebase-functions/v2/https';
import { fetchCandlesForScan } from './fetchCandlesForScan.js';
import { CallableRequest } from 'firebase-functions/v2/https';
import { Timeframe } from '../../../shared/data/Timeframe.js';
import { CandleData } from '../../../shared/data/CandleData.js';
import { defineSecret } from 'firebase-functions/params';

export const POLYGON_API_KEY = defineSecret('POLYGON_API_KEY'); // ✅ declare secret

type RequestData = {
  symbol: string;
  timeframe?: Timeframe;
  lookbackMinutes?: number;
};

export const getCandles = onCall({ secrets: [POLYGON_API_KEY] }, async (request: CallableRequest<RequestData>): Promise<Partial<Record<Timeframe, CandleData[]>>> => {
  const { symbol, timeframe, lookbackMinutes } = request.data;

  if (!symbol || typeof symbol !== 'string') {
    throw new Error('Missing or invalid "symbol"');
  }

  const result = await fetchCandlesForScan(symbol, timeframe, lookbackMinutes, POLYGON_API_KEY.value());
  return result;
});
