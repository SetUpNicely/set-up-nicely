// 📁 Location: /firebase/functions/src/scanConditions.ts

import { IndicatorResults } from '../../../shared/engine/indicators/calculateAllIndicators.js';

type ConditionFn = (indicators: IndicatorResults, logic: any) => boolean;

export const scanConditions: Record<string, ConditionFn> = {
  emaFast: (ind, logic) => {
    const fastKey = `ema${logic.emaFast}` as keyof IndicatorResults;
    const slowKey = `ema${logic.emaSlow}` as keyof IndicatorResults;

    const fast = ind[fastKey] as number | undefined;
    const slow = ind[slowKey] as number | undefined;

    if (fast == null || slow == null) return false;

    if (fast == null || slow == null) return false;
    return logic.direction === 'bullish' ? fast > slow : fast < slow;
  },

  volumeSpikeMultiplier: (ind, logic) =>
    ind.volumeSpikeMultiplier >= (logic.volumeSpikeMultiplier ?? 1.5),

  vwapReclaim: (ind, logic) => !!logic.vwapReclaim === !!ind.vwapReclaim,
  vwapReject: (ind, logic) => !!logic.vwapReject === !!ind.vwapReject,

  patternType: (ind, logic) => ind.patternType === logic.patternType,
  macdCross: (ind, logic) => ind.macdCross === logic.macdCross,
  rsiDivergence: (ind, logic) => ind.rsiDivergence === logic.rsiDivergence,
  priceStructure: (ind, logic) => ind.priceStructure === logic.priceStructure,
  keltnerSqueeze: (ind, logic) => ind.keltnerSqueeze === logic.keltnerSqueeze,
  liquiditySweep: (ind, logic) => ind.liquiditySweep === logic.liquiditySweep,
  pullbackLength: (ind, logic) =>
    (ind.pullbackLength ?? 0) >= (logic.pullbackLength ?? 0),

  rsiHoldAbove: (ind, logic) => (ind.rsi ?? 0) >= (logic.rsiHoldAbove ?? 50),
  rsiHoldBelow: (ind, logic) => (ind.rsi ?? 100) <= (logic.rsiHoldBelow ?? 50),
  adxThreshold: (ind, logic) => (ind.adx ?? 0) >= (logic.adxThreshold ?? 20),

  trendlineBreak: (ind, logic) => ind.trendlineBreak === logic.trendlineBreak,

  // Safe booleans
  volumeSpike: (ind, logic) => ind.volumeSpike === true,
  trend: (ind, logic) => ind.trend === logic.trend,
  breakout: (ind, logic) => ind.breakout === logic.breakout,
  breakdown: (ind, logic) => ind.breakdown === logic.breakdown,
  fillAndReverse: (ind, logic) => ind.fillAndReverse === logic.fillAndReverse,
  vcpConfirmed: (ind, logic) => ind.vcpConfirmed === logic.vcpConfirmed,
  outperformSPY: (ind, logic) => ind.outperformSPY === logic.outperformSPY,

  // Timeframe confirmation
  syncTimeframes: (ind, logic) =>
    Array.isArray(logic.syncTimeframes)
      ? logic.syncTimeframes.every((tf: string) =>
          ind.timeframesInAgreement?.includes(tf)
        )
      : true,

  confirmOnTimeframes: (ind, logic) =>
    Array.isArray(logic.confirmOnTimeframes)
      ? logic.confirmOnTimeframes.every((tf: string) =>
          ind.confirmedOnTimeframes?.includes(tf)
        )
      : true,

  // ORB-based and breakout params
  orbWindowMinutes: (ind, logic) => ind.orbWindow === logic.orbWindowMinutes,
  orbRetestLevel: (ind, logic) => ind.orbRetestLevel === logic.orbRetestLevel,
  breakoutConfirmed: (ind, logic) =>
    ind.breakoutConfirmed === logic.breakoutConfirmed,
  breakoutAfterPullback: (ind, logic) =>
    ind.breakoutAfterPullback === logic.breakoutAfterPullback,
  breakoutDirection: (ind, logic) =>
    ind.breakoutDirection === logic.breakoutDirection,
  keyLevelBreak: (ind, logic) =>
    ind.keyLevelBreak === logic.keyLevelBreak,
  retestHold: (ind, logic) => ind.retestHold === logic.retestHold,
  retestReject: (ind, logic) => ind.retestReject === logic.retestReject,

  // Other edge logic
  compareTo: (ind, logic) => ind.compareTo === logic.compareTo,
  trendMatch: (ind, logic) => ind.trendMatch === logic.trendMatch,
  relativeOutperformance: (ind, logic) =>
    ind.relativeOutperformance === logic.relativeOutperformance,
  adxConfirm: (ind, logic) => ind.adxConfirm === logic.adxConfirm,
  relativeVolume: (ind, logic) => ind.relativeVolume === logic.relativeVolume,
  relativeVolumeMultiplier: (ind, logic) =>
  (ind.relativeVolumeMultiplier ?? 0) >= (logic.relativeVolumeMultiplier ?? 1.5),

  candleClose: (ind, logic) => ind.candleClose === logic.candleClose,
  emaBounce: (ind, logic) =>
    ind.emaBounce?.toString() === logic.emaBounce?.toString(),
};
