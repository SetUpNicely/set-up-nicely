// 📁 /firebase/functions/src/dev/testIndicatorDebug.ts
// 📁 /firebase/functions/src/dev/testIndicatorDebug.ts

import { fetchCandlesForScan } from '../fetchCandlesForScan';
import { calculateAllIndicators } from '../../../../shared/engine/indicators/calculateAllIndicators';
import CandleData from '../../../../shared/data/CandleData';
import { Timeframe } from '../../../../shared/data/Timeframe'; // Adjust path if needed

// ✅ Safe constants
const TICKER = 'AAPL';
const TIMEFRAME: Timeframe = '1m';
const START = '2025-07-22T09:00:00Z';
const END = '2025-07-27T00:00:00Z';

function toUnixTime(dateStr: string): number {
  return new Date(dateStr).getTime(); // ✅ returns milliseconds
}



export async function testIndicatorDebug() {
  const candleMap = await fetchCandlesForScan(
  TICKER,
  TIMEFRAME,
  undefined,         // maxLookbackMinutes
  undefined,         // apiKey
  toUnixTime(START), // fixedFromMs
  toUnixTime(END)    // fixedToMs
 );




  const candles: CandleData[] = candleMap?.[TIMEFRAME] || [];

  if (!candles.length) {
    console.error(`❌ No candles returned for ${TICKER} (${TIMEFRAME})`);
    return;
  }

  console.log(`✅ Fetched ${candles.length} candles for ${TICKER} (${TIMEFRAME})`);

  for (let i = 20; i < candles.length; i++) {
    const slice = candles.slice(0, i + 1);
    const indicators = calculateAllIndicators(slice);

    const timestamp = new Date(candles[i].timestamp).toISOString();
    console.log(`\n🕒 ${timestamp} | close: ${candles[i].close}`);
    console.table(indicators);
  }
}

if (require.main === module) {
  testIndicatorDebug()
    .then(() => {
      console.log('\n✅ Indicator debug completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Error during debug:', err);
      process.exit(1);
    });
}
