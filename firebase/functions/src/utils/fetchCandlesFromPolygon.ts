// 📁 /firebase/functions/src/utils/fetchCandlesFromPolygon.ts

import fetch from 'node-fetch';
import { CandleData } from '../../../../shared/data/CandleData.js';
import { defineSecret } from 'firebase-functions/params';

// ✅ Secret param for POLYGON_API_KEY
export const POLYGON_API_KEY = defineSecret('POLYGON_API_KEY');

const BASE_URL = 'https://api.polygon.io';

type PolygonCandleResponse = {
  results?: {
    t: number;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
  }[];
  next_url?: string;
};

function toISODate(ts: number): string {
  return new Date(ts).toISOString().split('T')[0]; // YYYY-MM-DD
}

export async function fetchCandlesFromPolygon(
  symbol: string,
  from: number, // in ms
  to: number    // in ms
): Promise<CandleData[]> {
  const API_KEY = POLYGON_API_KEY.value();
  if (!API_KEY) throw new Error('❌ POLYGON_API_KEY is not defined as a Firebase secret');

  const now = Date.now();
  const clampedTo = now - (now % 60000) - 60000;
  const finalTo = Math.min(to, clampedTo);

  const CHUNK_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
  const allCandles: CandleData[] = [];

  // Clamp from/to to midnight UTC boundaries
  from = new Date(from).setUTCHours(0, 0, 0, 0);
  const toClamped = new Date(finalTo).setUTCHours(0, 0, 0, 0);

  for (let start = from; start < toClamped; start += CHUNK_MS) {
    const end = Math.min(start + CHUNK_MS, toClamped);

    const fromDate = toISODate(start);
    const toDate = toISODate(end);

    let pageUrl: string | undefined = `${BASE_URL}/v2/aggs/ticker/${symbol}/range/1/minute/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=50000&apiKey=${API_KEY}`;

    console.log(`📦 ${symbol}: Fetching ${fromDate} → ${toDate}`);
    console.log(`🌐 URL: ${pageUrl}`);

    try {
      do {
        const res = await fetch(pageUrl);
        if (!res.ok) {
          const body = await res.text();
          console.error(`❌ Polygon fetch failed: ${res.status} ${res.statusText} - ${body}`);
          break;
        }

        const data = await res.json() as PolygonCandleResponse;

        if (!data.results || data.results.length === 0) {
          console.warn(`⚠️ No data for ${symbol} (${fromDate} → ${toDate})`);
          break;
        }

        const candles: CandleData[] = data.results.map(d => ({
          symbol,
          timestamp: Math.floor(d.t / 1000), // ✅ Convert ms → sec
          open: d.o,
          high: d.h,
          low: d.l,
          close: d.c,
          volume: d.v,
        }));

        allCandles.push(...candles);

        pageUrl = data.next_url ? `${data.next_url}&apiKey=${API_KEY}` : undefined;
      } while (pageUrl);
    } catch (err) {
      console.error(`🔥 Exception while fetching ${symbol}:`, err);
    }
  }

  // Sort and dedupe
  allCandles.sort((a, b) => a.timestamp - b.timestamp);
  const uniqueCandles = allCandles.filter((c, i, arr) => i === 0 || c.timestamp !== arr[i - 1].timestamp);

  console.log(`[fetchCandlesFromPolygon] ✅ ${symbol} → ${uniqueCandles.length} candles`);
  return uniqueCandles;
}
