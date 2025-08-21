import { Storage } from '@google-cloud/storage';
import { CandleStore } from './CandleStore.js';
import { Timeframe } from '../../../../shared/data/Timeframe.js';
import { CandleData } from '../../../../shared/data/CandleData.js';
import { aggregateCandles } from '../../../../shared/logic/aggregateFrom1m.js';
import zlib from 'zlib';

const bucketName = 'set-up-nicely-flatfiles';
const timeframe: Timeframe = '1m';

// ✅ Timeframe → Number of 1m candles needed to generate 20 bars (or 18 for 4h)
const required1mBars: Partial<Record<Timeframe, number>> = {
  '1m': 20,
  '5m': 100,
  '15m': 300,
  '30m': 600,
  '1h': 1200,
  '4h': 5760, // ~18 bars
};

const timeframesToAggregate: Exclude<Timeframe, '1m' | 'D' | 'W'>[] = [
  '5m', '15m', '30m', '1h', '4h',
];

export async function preloadRecentCandlesFromGCS(
  candleStore: CandleStore,
  tickers: string[],
  days: number = 5
) {
  const storage = new Storage();
  const dates = getPastDates(days);

  console.log(`⏳ Preloading ${days} days of 1m candles for ${tickers.length} tickers...`);

  const tasks: Promise<void>[] = [];

  for (const symbol of tickers) {
    tasks.push(
      (async () => {
        const all1m: CandleData[] = [];

        for (const dateStr of dates) {
          const file = storage.bucket(bucketName).file(`candles/${symbol}/${dateStr}.json.gz`);
          try {
            const [compressedBuffer] = await file.download();
            const jsonBuffer = zlib.gunzipSync(compressedBuffer);
            const candles: CandleData[] = JSON.parse(jsonBuffer.toString());

            all1m.push(...candles);
          } catch (err) {
            console.warn(`⚠️ Failed to load ${symbol} on ${dateStr}: ${(err as Error).message}`);
          }
        }

        if (!all1m.length) return;

        // Sort candles
        all1m.sort((a, b) => a.timestamp - b.timestamp);

        // ✅ Store latest 20 1m candles
        const latest1m = all1m.slice(-20);
        candleStore.setBulk(symbol, '1m', latest1m);

        // ✅ Aggregate and store only what’s needed for each timeframe
        for (const tf of timeframesToAggregate) {
          const sliceSize = required1mBars[tf];
          if (!sliceSize) continue;

          const subset = all1m.slice(-sliceSize);
          const aggregatedMap = aggregateCandles(subset, [tf]);

          const aggregated = aggregatedMap[tf];
          if (!aggregated || !aggregated.length) continue;

          const limit = tf === '4h' ? 18 : 20;
          const trimmed = aggregated.slice(-limit);
          candleStore.setBulk(symbol, tf, trimmed);
        }

        console.log(`✅ Preloaded ${symbol}: 1m + minimal aggregates`);
      })()
    );
  }

  await Promise.all(tasks);
  console.log(`✅ Candle preloading complete for all ${tickers.length} tickers.`);
}

function getPastDates(days: number): string[] {
  const dates: string[] = [];
  const now = new Date();
  for (let i = 1; i <= days; i++) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}
