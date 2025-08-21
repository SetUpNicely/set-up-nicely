// 📍 /firebase/functions/src/helpers/CandleStore.ts
import { CandleData } from '../../../../shared/data/CandleData.js';
import { Timeframe } from '../../../../shared/data/Timeframe.js';

export class CandleStore {
  private store: Record<string, Partial<Record<Timeframe, CandleData[]>>> = {};

  update(ticker: string, tf: Timeframe, newCandle: CandleData) {
    if (!this.store[ticker]) this.store[ticker] = {};               // Init ticker
    if (!this.store[ticker][tf]) this.store[ticker][tf] = [];       // Init timeframe

    const buffer = this.store[ticker][tf]!;
    const last = buffer[buffer.length - 1];

    if (!last || newCandle.timestamp > last.timestamp) {
      buffer.push(newCandle);
      if (buffer.length > 20) {
        this.store[ticker][tf] = buffer.slice(-20);
      }
    }
  }

  getLatest(ticker: string, tf: Timeframe): CandleData | undefined {
    const tfData = this.store[ticker]?.[tf];
    return tfData?.[tfData.length - 1];
  }

  getAll(ticker: string, tf: Timeframe): CandleData[] {
    return this.store[ticker]?.[tf] || [];
  }

  setBulk(ticker: string, tf: Timeframe, candles: CandleData[]) {
    this.store[ticker] = this.store[ticker] || {};
    this.store[ticker][tf] = candles;
  }

  hasTicker(ticker: string): boolean {
    return !!this.store[ticker];
  }
}
