// /shared/engine/indicators/liquiditySweep.ts
import { CandleData } from '../../data/CandleData.js'

/**
 * Detects a potential liquidity sweep pattern:
 * - Long wick beyond previous high/low
 * - Close back inside the prior range
 * - Optionally, high volume spike for confirmation
 */
export function detectLiquiditySweep(
  current: CandleData,
  previous: CandleData,
  volumeSpike?: boolean,
  wickRatioThreshold = 1.5
): boolean {
  const upperWick = current.high - Math.max(current.open, current.close)
  const lowerWick = Math.min(current.open, current.close) - current.low
  const bodySize = Math.abs(current.open - current.close)

  const sweptHigh = current.high > previous.high && current.close < previous.high
  const sweptLow = current.low < previous.low && current.close > previous.low

  const upperWickRatio = upperWick / (bodySize || 0.0001)
  const lowerWickRatio = lowerWick / (bodySize || 0.0001)

  const isUpperSweep = sweptHigh && upperWickRatio >= wickRatioThreshold
  const isLowerSweep = sweptLow && lowerWickRatio >= wickRatioThreshold

  // Optionally require volume spike confirmation if passed in
  if (volumeSpike === true) {
    return (isUpperSweep || isLowerSweep) && current.volume > previous.volume
  }

  return isUpperSweep || isLowerSweep
}
