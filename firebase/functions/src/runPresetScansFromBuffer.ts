// 📍 /shared/logic/runPresetScansFromBuffer.ts
import { CandleStore } from './helpers/CandleStore';
import { presetScans } from '../../../shared/data/presetScans.js'; // Adjust if needed
import { evaluateScanLogic } from './evaluateScanLogic.js'; // Your logic engine
import { calculateAllIndicators } from '../../../shared/engine/indicators/calculateAllIndicators.js';
import { shouldRunScan } from '../../../shared/utils/shouldRunScan.js';
import { storeTriggerStub } from './services/storeTriggerStub.js';
import { Timeframe } from '../../../shared/data/Timeframe.js';
import { CandleData } from '../../../shared/data/CandleData.js';

export async function runPresetScansFromBuffer(
  ticker: string,
  candleStore: CandleStore,
  today: string
) {
  for (const scan of presetScans) {
    const tf: Timeframe = scan.timeframe;

    const latestCandle: CandleData | undefined = candleStore.getLatest(ticker, tf);
    if (!latestCandle) continue;

    if (!shouldRunScan(tf, latestCandle.timestamp)) continue;

    const candles = candleStore.getAll(ticker, tf);
    const indicators = calculateAllIndicators(candles);

    const match = evaluateScanLogic(scan.logic, indicators);
    if (match) {
      await storeTriggerStub({
        scanId: scan.id,
        symbol: ticker,
        timeframe: tf,
        timestamp: latestCandle.timestamp,
        triggered: true,
        evaluatedAt: Date.now(),
        direction: scan.direction || 'bullish', // Optional: default to bullish
      });

      console.log(`[TRIGGERED] ${ticker} → ${scan.name} @ ${tf} on ${new Date(latestCandle.timestamp).toISOString()}`);
    }
  }
}
