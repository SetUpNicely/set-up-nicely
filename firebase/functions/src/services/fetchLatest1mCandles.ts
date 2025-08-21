// 📍 /firebase/functions/src/services/fetchLatest1mCandles.ts
import fetch from 'node-fetch';
import { CandleData } from '../../../../shared/data/CandleData.js';
import { defineSecret } from 'firebase-functions/params';

const POLYGON_API_KEY = defineSecret('POLYGON_API_KEY');

interface PolygonAggResult {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface PolygonAggsResponse {
  results?: PolygonAggResult[];
}

export async function fetchLatest1mCandles(
  tickers: string[]
): Promise<Record<string, CandleData[]>> {
  const apiKey = POLYGON_API_KEY.value();
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60_000);
  const todayStr = oneMinuteAgo.toISOString().split('T')[0];

  const results: Record<string, CandleData[]> = {};

  for (const symbol of tickers) {
    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/minute/${todayStr}/${todayStr}?adjusted=true&sort=desc&limit=2&apiKey=${apiKey}`;
      const res = await fetch(url);
      const json = (await res.json()) as PolygonAggsResponse;

      if (!json?.results?.length) continue;

      const candles: CandleData[] = json.results.map((c) => ({
        symbol,
        timestamp: Math.floor(c.t / 1000), // 🔧 Convert ms → sec
        open: c.o,
        high: c.h,
        low: c.l,
        close: c.c,
        volume: c.v,
      }));

      results[symbol] = candles.sort((a, b) => a.timestamp - b.timestamp);
    } catch (err) {
      console.error(`⚠️ Failed to fetch candles for ${symbol}`, err);
    }
  }

  return results;
}
