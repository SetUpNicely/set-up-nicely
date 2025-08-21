// 📍 /firebase/functions/src/dev/manualRunBuildAllowedTickers.ts

const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');
const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const POLYGON_API_KEY = process.env.POLYGON_API_KEY;
const BUCKET_NAME = 'set-up-nicely-flatfiles';
const GCS_FILE_PATH = 'allowed/allowedTickers.json';

const SECTOR_ETFS = [
  // Original 14 sector/index ETFs
  'SPY', 'QQQ', 'DIA', 'IWM',
  'XLK', 'XLE', 'XLF', 'XLY',
  'XLI', 'XLV', 'XLB', 'XLRE',
  'XLU', 'XLC',

  // Additional highly traded ETFs
  'VTI', // Total stock market
  'GLD', // Gold
  'SLV', // Silver
  'TLT', // Treasury bonds
  'HYG', // High-yield bonds
  'ARKK', // ARK Innovation
  'BITO', // Bitcoin futures
  'SOXX', // Semiconductors
  'XBI', // Biotech
  'VXX'  // Volatility
];


interface PolygonSnapshotTicker {
  ticker: string;
  day?: { c?: number; v?: number }; // closing price and volume
}

interface PolygonSnapshotV2Response {
  tickers: PolygonSnapshotTicker[];
}

async function main() {
  if (!POLYGON_API_KEY) throw new Error('Missing POLYGON_API_KEY');

  console.log('📡 Fetching top tickers from Polygon...');
  const res = await fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${POLYGON_API_KEY}`);
  const data = await res.json() as PolygonSnapshotV2Response;

  if (!data?.tickers?.length) {
    console.error('❌ No tickers returned from Polygon');
    return;
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

  const filtered = enriched.filter((d) =>
    typeof d.ticker === 'string' &&
    d.ticker.length > 0 &&
    /^[A-Z0-9.\-]+$/.test(d.ticker) &&
    d.estimated_market_cap > 1_000_000
  );

  console.log(`✅ Filtered tickers: ${filtered.length}`);

  const sorted = filtered
    .sort((a, b) => b.estimated_market_cap - a.estimated_market_cap)
    .map((d) => d.ticker);

  const top2000 = sorted.slice(0, 2000);
  const combined = Array.from(new Set([...SECTOR_ETFS, ...top2000])).sort();

  console.log(`✅ Final combined list: ${combined.length} tickers`);
  console.log('📎 Preview:', combined.slice(0, 10));

  const outDir = join(process.cwd(), 'tmp');
  const outPath = join(outDir, 'allowedTickers.json');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(combined, null, 2));

  const storage = new Storage();
  await storage.bucket(BUCKET_NAME).upload(outPath, {
    destination: GCS_FILE_PATH,
    contentType: 'application/json',
    metadata: {
      cacheControl: 'public, max-age=86400',
    },
  });

  console.log(`✅ Uploaded to gs://${BUCKET_NAME}/${GCS_FILE_PATH}`);
}

main().catch(console.error);
