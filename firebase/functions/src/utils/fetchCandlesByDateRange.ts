import fetch from 'node-fetch';
import { CandleData } from '../../../../shared/data/CandleData.js';
import { getNextValidCandleTime, getPrevValidCandleTime } from './getNearestValidCandleTime.js';

type PolygonBarResponse = {
  bars?: {
    t: string;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
  }[];
  next_page_token?: string;
};

// 🛠️ Clarified parameter naming
function toISODate(ms: number): string {
  return new Date(ms).toISOString().split('T')[0];
}

export async function fetchCandlesByDateRange(
  symbol: string,
  from: number,
  to: number,
  apiKey: string
): Promise<CandleData[]> {
  if (!apiKey) throw new Error('❌ Polygon API key required');

  let allCandles: CandleData[] = [];
  let nextPageToken: string | undefined = undefined;

  const fromDate = toISODate(from);
  const toDate = toISODate(to);

  do {
    const url = new URL(`https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/minute/${fromDate}/${toDate}`);
    url.searchParams.append('adjusted', 'true');
    url.searchParams.append('limit', '50000');
    url.searchParams.append('sort', 'asc');
    url.searchParams.append('apiKey', apiKey);
    if (nextPageToken) {
      url.searchParams.append('page_token', nextPageToken);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`❌ Failed to fetch candles for ${symbol}: ${response.status} - ${errorBody}`);
    }

    const data = await response.json() as PolygonBarResponse;

    if (!data.bars || !Array.isArray(data.bars)) {
      console.warn(`⚠️ No candle data returned for ${symbol} (${fromDate} to ${toDate})`);
      break;
    }

    const candles: CandleData[] = data.bars.map(bar => ({
      symbol,
      timestamp: new Date(bar.t).getTime(),
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v,
    }));

    allCandles.push(...candles);
    nextPageToken = data.next_page_token;
  } while (nextPageToken);

  allCandles.sort((a, b) => a.timestamp - b.timestamp);
  allCandles = allCandles.filter((c, i, arr) => i === 0 || c.timestamp !== arr[i - 1].timestamp);

  const correctedFrom = getNextValidCandleTime(allCandles, from);
  const correctedTo = getPrevValidCandleTime(allCandles, to);

  if (correctedFrom === null || correctedTo === null) {
    console.warn(`⚠️ No valid candle times found for ${symbol}`);
    return [];
  }

  return allCandles.filter(c => c.timestamp >= correctedFrom && c.timestamp <= correctedTo);
}
