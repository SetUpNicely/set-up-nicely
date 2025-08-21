// 📍 /firebase/functions/src/schedule/buildAllowedTickers.ts

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { Storage } from '@google-cloud/storage';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import fetch from 'node-fetch';

const polygonApiKey = defineSecret('POLYGON_API_KEY');
const BUCKET_NAME = 'set-up-nicely-flatfiles';
const GCS_FILE_PATH = 'allowed/allowedTickers.json';
const MIN_EXPECTED_TICKERS = 500;

const SECTOR_ETFS = [
  // Original 14 sector/index ETFs
  'SPY', 'QQQ', 'DIA', 'IWM',
  'XLK', 'XLE', 'XLF', 'XLY',
  'XLI', 'XLV', 'XLB', 'XLRE',
  'XLU', 'XLC',
  // Additional highly traded ETFs
  'VTI', 'GLD', 'SLV', 'TLT', 'HYG',
  'ARKK', 'BITO', 'SOXX', 'XBI', 'VXX'
];

interface PolygonSnapshotTicker {
  ticker: string;
  day?: { c?: number; v?: number }; // close, volume
}

interface PolygonSnapshotV2Response {
  tickers: PolygonSnapshotTicker[];
}

async function fetchTopTickers(apiKey: string): Promise<string[] | null> {
  console.log('📡 Fetching top tickers from Polygon...');
  const res = await fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${apiKey}`);
  const data = (await res.json()) as PolygonSnapshotV2Response;

  if (!data?.tickers?.length) {
    console.error('❌ No tickers returned from Polygon');
    return null;
  }

  console.log(`✅ Received ${data.tickers.length} tickers`);
  console.log('📊 Sample tickers:', data.tickers.slice(0, 3));

  const enriched = data.tickers.map((d) => {
    const price = d.day?.c ?? 0;
    const volume = d.day?.v ?? 0;
    return {
      ticker: d.ticker,
      estimated_market_cap: price * volume
    };
  });

  const filtered = enriched.filter(
    (d) =>
      typeof d.ticker === 'string' &&
      d.ticker.length > 0 &&
      /^[A-Z0-9.\-]+$/.test(d.ticker) &&
      d.estimated_market_cap > 1_000_000
  );

  console.log(`✅ Filtered tickers: ${filtered.length}`);

  if (filtered.length < MIN_EXPECTED_TICKERS) {
    console.warn(`⚠️ Only ${filtered.length} valid tickers found — market likely closed. Skipping upload.`);
    return null;
  }

  const sorted = filtered
    .sort((a, b) => b.estimated_market_cap - a.estimated_market_cap)
    .map((d) => d.ticker);

  const top2000 = sorted.slice(0, 2000);
  return Array.from(new Set([...SECTOR_ETFS, ...top2000])).sort();
}

async function uploadToGCS(tickers: string[]) {
  const outDir = join(process.cwd(), 'tmp');
  const outPath = join(outDir, 'allowedTickers.json');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(tickers, null, 2));

  const storage = new Storage();
  await storage.bucket(BUCKET_NAME).upload(outPath, {
    destination: GCS_FILE_PATH,
    contentType: 'application/json',
    metadata: {
      cacheControl: 'public, max-age=86400'
    }
  });

  console.log(`✅ Uploaded to gs://${BUCKET_NAME}/${GCS_FILE_PATH}`);
}

export const buildAllowedTickers = onSchedule(
  {
    schedule: '30 13 * * 1-5', // 9:30 AM ET on weekdays
    timeZone: 'America/New_York',
    secrets: [polygonApiKey],
    timeoutSeconds: 300,
  },
  async () => {
    const apiKey = polygonApiKey.value();
    const tickers = await fetchTopTickers(apiKey);
    if (tickers) {
      console.log(`✅ Final combined list: ${tickers.length} tickers`);
      console.log('📎 Preview:', tickers.slice(0, 10));
      await uploadToGCS(tickers);
    }
  }
);
