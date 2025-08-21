// 📍 /firebase/functions/src/schedule/runIntradayScansEveryMinute.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { CandleStore } from '../helpers/CandleStore';
import { fetchLatest1mCandles } from '../services/fetchLatest1mCandles.js';
import { aggregateCandles } from '../../../../shared/logic/aggregateFrom1m.js';
import { runPresetScansFromBuffer } from '../runPresetScansFromBuffer.js';
import { Timeframe } from '../../../../shared/data/Timeframe.js';
import { logger } from 'firebase-functions';
import { isMarketOpen } from '../utils/isMarketOpen.js';

export const runIntradayScansEveryMinute = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: 'America/New_York',
    retryCount: 0,
    timeoutSeconds: 60,
  },
  async () => {
    const today = new Date().toISOString().split('T')[0];

    if (!isMarketOpen()) {
      logger.info('📉 Market is closed. Skipping intraday scan.');
      return;
    }

    const tickers = ['AAPL', 'MSFT', 'TSLA', 'META', 'AMD']; // 🔁 Replace with dynamic list
    const all1mCandles = await fetchLatest1mCandles(tickers);

    const candleStore = new CandleStore();

    for (const [ticker, candles1m] of Object.entries(all1mCandles)) {
      if (!candles1m.length) continue;

      // 🕐 Update 1m candles
      for (const c of candles1m) {
        candleStore.update(ticker, '1m', c);
      }

      // ⏫ Aggregate timeframes
      const aggregates = aggregateCandles(candles1m, ['5m', '15m', '30m', '1h', '4h'] as Timeframe[]);
      for (const [tf, series] of Object.entries(aggregates)) {
        for (const c of series) {
          candleStore.update(ticker, tf as Timeframe, c);
        }
      }

      // 🚨 Run scans
      await runPresetScansFromBuffer(ticker, candleStore, today);
    }

    logger.info(`✅ Intraday scan loop complete for ${tickers.length} tickers.`);
  }
);
