// /shared/engine/indicators/patternRecognition.ts
import { CandleData } from '../../data/CandleData.js'

export type RecognizedPattern =
  | 'bullishEngulfing'
  | 'bearishEngulfing'
  | 'hammer'
  | 'invertedHammer'
  | 'doji'
  | 'shootingStar'
  | 'morningStar'
  | 'eveningStar'
  | null

export function detectPattern(current: CandleData, previous: CandleData): RecognizedPattern {
  const bodySize = Math.abs(current.close - current.open)
  const upperWick = current.high - Math.max(current.open, current.close)
  const lowerWick = Math.min(current.open, current.close) - current.low
  const totalRange = current.high - current.low
  const smallBody = bodySize < totalRange * 0.2
  const longLowerWick = lowerWick > bodySize * 2
  const longUpperWick = upperWick > bodySize * 2

  // Bullish Engulfing
  if (
    previous.close < previous.open && // previous is red
    current.close > current.open && // current is green
    current.open < previous.close &&
    current.close > previous.open
  ) {
    return 'bullishEngulfing'
  }

  // Bearish Engulfing
  if (
    previous.close > previous.open && // previous is green
    current.close < current.open && // current is red
    current.open > previous.close &&
    current.close < previous.open
  ) {
    return 'bearishEngulfing'
  }

  // Hammer (bullish reversal)
  if (current.close > current.open && longLowerWick && smallBody) {
    return 'hammer'
  }

  // Inverted Hammer
  if (current.close > current.open && longUpperWick && smallBody) {
    return 'invertedHammer'
  }

  // Shooting Star (bearish reversal)
  if (current.close < current.open && longUpperWick && smallBody) {
    return 'shootingStar'
  }

  // Doji
  if (bodySize < totalRange * 0.05) {
    return 'doji'
  }

  // Morning Star (basic version)
  if (
    previous.close < previous.open &&
    current.close > current.open &&
    previous.close > current.close &&
    Math.abs(previous.close - current.close) > totalRange * 0.5
  ) {
    return 'morningStar'
  }

  // Evening Star
  if (
    previous.close > previous.open &&
    current.close < current.open &&
    previous.close < current.close &&
    Math.abs(previous.close - current.close) > totalRange * 0.5
  ) {
    return 'eveningStar'
  }

  return null
}
