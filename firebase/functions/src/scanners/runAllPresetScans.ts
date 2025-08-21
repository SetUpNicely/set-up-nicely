// 📁 /firebase/functions/src/scanners/runAllPresetScans.ts
import { presetScans } from '../../../../shared/data/presetScans.js';
import { fetchCandlesByDateRange } from '../utils/fetchCandlesByDateRange.js';
import { aggregateCandles } from '../utils/aggregatedCandles.js';
import { calculateAllIndicators } from '../../../../shared/engine/indicators/calculateAllIndicators.js';
import { evaluateScanLogic } from '../evaluateScanLogic.js';
import { calculatePVS } from '../calculatePVS.js';
import { storeTriggerMetadata } from '../services/storeTriggerMetadata.js';
import { getTopTickersByMarketCap } from '../utils/getTopTickersByMarketCap.js';
import { Timeframe } from '../../../../shared/data/Timeframe.js';
import { isMarketOpen } from '../utils/isMarketOpen.js';
import { getTimeRangeForTimeframe } from '../utils/getTimeRangeForTimeframe.js';

/**
 * Executes all preset scans for all timeframes across top tickers.
 * Allows injection of a fixed date range (fromMs, toMs) in milliseconds.
 */
export async function runAllPresetScans(
  apiKey: string,
  fromMs?: number,
  toMs?: number
) {
  if (!isMarketOpen()) {
    console.log('⏸️ Market is closed — skipping runAllPresetScans execution.');
    return;
  }

  const tickers = await getTopTickersByMarketCap();
  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', 'D', 'W'];
  const now = Date.now();

  for (const timeframe of timeframes) {
    const scansForTF = presetScans.filter(scan => scan.timeframe === timeframe);
    if (scansForTF.length === 0) continue;

    // Convert fallback seconds to ms if needed
    const { from, to } = fromMs && toMs
      ? { from: fromMs, to: toMs }
      : (() => {
          const { fromSec, toSec } = getTimeRangeForTimeframe(timeframe);
          return { from: fromSec * 1000, to: toSec * 1000 };
        })();

    for (const symbol of tickers) {
      try {
        const baseCandles = await fetchCandlesByDateRange(symbol, from, to, apiKey);
        if (!baseCandles?.length) continue;

        const allCandles = aggregateCandles(baseCandles);
        const candles = timeframe === '1m' ? baseCandles : allCandles[timeframe];
        if (!candles || candles.length < 50) continue;

        for (const scan of scansForTF) {
          for (let i = 20; i < candles.length; i++) {
            const indicators = calculateAllIndicators(candles, i);
            const triggered = evaluateScanLogic(scan.logic, indicators);
            if (!triggered) continue;

            const triggerCandle = candles[i];
            const timestamp = triggerCandle.timestamp;

            const pvsResult = await calculatePVS({
              scan,
              candles,
              triggerIndex: i,
              timeframe,
            });

            await storeTriggerMetadata({
              scanId: scan.id,
              symbol,
              timeframe,
              timestamp,
              direction: scan.direction ?? 'bullish',
              triggered: true,
              evaluatedAt: now,

              moveScore: pvsResult.moveScore,
              rrScore: pvsResult.rrScore,
              speedScore: pvsResult.speedScore,
              volumeSpike: pvsResult.volumeSpike,
              continuation: pvsResult.continuation,
              falseSignal: pvsResult.falseSignal,
              pvsScore: pvsResult.pvsScore,

              hitTarget: pvsResult.hitTarget ?? pvsResult.hit ?? false,
              hitStop: pvsResult.hitStop ?? false,
              candlesUntilHit: pvsResult.candlesUntilHit ?? pvsResult.timeToTarget ?? -1,
              maxDrawdownPercent: pvsResult.maxDrawdownPercent ?? 0,
            });

            break; // ⛔ One trigger per scan per ticker
          }
        }
      } catch (err) {
        console.error(`⚠️ Scan error for ${symbol} [${timeframe}]`, err);
      }
    }
  }
}
