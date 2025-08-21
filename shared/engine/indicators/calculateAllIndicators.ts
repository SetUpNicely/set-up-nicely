// 📁 /shared/engine/indicators/calculateAllIndicators.ts
// 📍 /shared/engine/indicators/calculateAllIndicators.ts

import { CandleData } from '../../data/CandleData.js';

// Core Indicators
import { calculateEMA } from './ema.js';
import { calculateSMA } from './sma.js';
import { calculateMACD } from './macd.js';
import { calculateRSI } from './rsi.js';
import { calculateVWAP } from './vwap.js';
import { calculateADX } from './adx.js';
import { calculateATR } from './atr.js';
import { calculateOBV } from './obv.js';
import { calculateCCI } from './cci.js';
import { calculateBollingerBands } from './bollingerBands.js';
import { calculateStochastic } from './stochastic.js';
import { calculateCMF } from './cmf.js';
import { calculatePivotPoints } from './pivotPoints.js';
import { calculateDonchianChannels } from './donchian.js';
import { calculateROC } from './roc.js';
import { calculateSuperTrend } from './superTrend.js';
import { calculateIchimoku } from './ichimoku.js';
import { calculateDEMA } from './dema.js';
import { calculateTEMA } from './tema.js';
import { calculateWilliamsR } from './williamsR.js';

// Custom Logic
import { detectVolumeSurge } from './volumeSurge.js';
import { detectGapFill } from './gapFill.js';
import { detectOpeningRange } from './openingRange.js';
import { detectLiquiditySweep } from './liquiditySweep.js';
import { detectTrendlineBreak } from './trendlineBreak.js';
import { detectPattern } from './patternRecognition.js';
import { detectRSIDivergence } from './rsiDivergence.js';
import { detectPriceStructure } from './priceStructure.js';
import { countPullback } from './pullbackLength.js';
import { calculateRelativeStrengthSPY } from './relativeStrengthSPY.js';
import { detectKeltnerSqueeze } from './keltnerChannels.js';
import { getPremarketLevels } from './premarketHighLow.js';

export interface IndicatorResults {
  [key: string]: any; // ✅ Allow dynamic access with `
  // Core
  price: number;
  ema5: number;
  ema8: number;
  ema9: number;
  ema13: number;
  ema20: number;
  ema21: number;
  ema34: number;
  ema50: number;
  ema100: number;
  ema200: number;
  sma50: number;
  rsi: number;
  vwap: number;
  atr: number;
  obv: number;
  cci: number;
  adx: number;
  bollinger: { upper: number; middle: number; lower: number };
  stochastic: { k: number; d: number };
  cmf: number;
  pivotPoints: { r1: number; s1: number; r2: number; s2: number; r3: number; s3: number };
  donchian: any;
  roc: number;
  superTrend: any;
  ichimoku: any;
  tema: number;
  dema: number;
  williamsR: number;

  // Custom Logic
  volumeSpike?: boolean;
  volumeSpikeMultiplier: number;
  gapFill?: boolean;
  openingRange?: any;
  liquiditySweep?: boolean;
  trendlineBreak?: boolean;
  patternType?: string | null;
  rsiDivergence?: boolean;
  priceStructure?: string | null;
  pullbackLength?: number;
  relativeStrengthSPY?: number | null;
  keltnerSqueeze?: boolean;
  premarketLevels?: any;
  vwapReclaim?: boolean;
  vwapReject?: boolean;
  macdCross?: 'bullish' | 'bearish' | null;

  // Extended fields for scan logic
  macdHist?: number;
  trend?: string;
  breakout?: boolean;
  breakdown?: boolean;
  fillAndReverse?: boolean;
  vcpConfirmed?: boolean;
  outperformSPY?: boolean;
  timeframesInAgreement?: string[];
  confirmedOnTimeframes?: string[];
  orbWindow?: number;
  orbRetestLevel?: number;
  breakoutConfirmed?: boolean;
  breakoutAfterPullback?: boolean;
  breakoutDirection?: string;
  keyLevelBreak?: boolean;
  retestHold?: boolean;
  retestReject?: boolean;
  compareTo?: string;
  trendMatch?: string;
  relativeOutperformance?: boolean;
  adxConfirm?: boolean;
  relativeVolume?: number;
  relativeVolumeMultiplier?: number;
  candleClose?: number;
  emaBounce?: string;
}

export function calculateAllIndicators(
  candles: CandleData[],
  anchorIndex: number = candles.length - 1,
  spyCloses: number[] = [],
  trendline: any[] = []
): IndicatorResults {
  const current = candles[anchorIndex];
  const prev = candles[anchorIndex - 1];
  const vwapValue = calculateVWAP(candles, anchorIndex);
  const macd = calculateMACD(candles, anchorIndex);
  const macdPrev = anchorIndex > 0 ? calculateMACD(candles, anchorIndex - 1) : null;
  const volumeSpike = detectVolumeSurge(candles, anchorIndex);

  const rsSpy =
    spyCloses.length > 0
      ? Number(
          calculateRelativeStrengthSPY(
            candles.map((c, i) =>
              i > 0 ? (c.close - candles[i - 1].close) / candles[i - 1].close : 0
            ),
            spyCloses,
            anchorIndex
          )
        )
      : null;

  return {
    price: current?.close ?? 0,
    ema5: calculateEMA(candles, 5, anchorIndex),
    ema8: calculateEMA(candles, 8, anchorIndex),
    ema9: calculateEMA(candles, 9, anchorIndex),
    ema13: calculateEMA(candles, 13, anchorIndex),
    ema20: calculateEMA(candles, 20, anchorIndex),
    ema21: calculateEMA(candles, 21, anchorIndex),
    ema34: calculateEMA(candles, 34, anchorIndex),
    ema50: calculateEMA(candles, 50, anchorIndex),
    ema100: calculateEMA(candles, 100, anchorIndex),
    ema200: calculateEMA(candles, 200, anchorIndex),
    sma50: calculateSMA(candles, 50, anchorIndex),
    macdHist: macd.histogram,
    rsi: calculateRSI(candles, 14, anchorIndex),
    vwap: vwapValue,
    atr: calculateATR(candles, 14, anchorIndex),
    obv: calculateOBV(candles, anchorIndex),
    cci: calculateCCI(candles, 20, anchorIndex),
    adx: calculateADX(candles, 14, anchorIndex),
    bollinger: calculateBollingerBands(candles, 20, anchorIndex),
    stochastic: calculateStochastic(candles, anchorIndex),
    cmf: calculateCMF(candles, anchorIndex),
    pivotPoints: calculatePivotPoints(candles, anchorIndex),
    donchian: calculateDonchianChannels(candles, 20, anchorIndex),
    roc: calculateROC(candles, 12, anchorIndex),
    superTrend: calculateSuperTrend(candles, anchorIndex),
    ichimoku: calculateIchimoku(candles, anchorIndex),
    tema: calculateTEMA(candles, 20, anchorIndex),
    dema: calculateDEMA(candles, 20, anchorIndex),
    williamsR: calculateWilliamsR(candles, anchorIndex),

    volumeSpike,
    volumeSpikeMultiplier: typeof volumeSpike === 'number' ? volumeSpike : 0,
    gapFill: detectGapFill(candles, anchorIndex),
    openingRange: detectOpeningRange(candles),
    liquiditySweep: anchorIndex > 0 ? detectLiquiditySweep(current, prev) : false,
    trendlineBreak: !!detectTrendlineBreak(candles, anchorIndex, trendline),
    patternType: anchorIndex > 0 ? detectPattern(current, prev) : null,
    rsiDivergence: !!detectRSIDivergence(candles, anchorIndex),
    priceStructure: detectPriceStructure(candles, anchorIndex),
    pullbackLength: countPullback(candles, anchorIndex),
    relativeStrengthSPY: rsSpy,
    keltnerSqueeze: detectKeltnerSqueeze(candles, anchorIndex),
    premarketLevels: getPremarketLevels(candles),
    vwapReclaim: current.low < vwapValue && current.close > vwapValue,
    vwapReject: current.high > vwapValue && current.close < vwapValue,
    macdCross: (() => {
      if (!macd || !macdPrev) return null;
      if (macdPrev.histogram < 0 && macd.histogram > 0) return 'bullish';
      if (macdPrev.histogram > 0 && macd.histogram < 0) return 'bearish';
      return null;
    })(),
  };
}

export default calculateAllIndicators;
