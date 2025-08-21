// 📁 Location: /src/engine/scans/evaluateScanLogic.ts
import { scanConditions } from './scanConditions.js';
import { IndicatorResults } from '../../../shared/engine/indicators/calculateAllIndicators.js';

export type ScanLogic = Record<string, any>;

function evaluateCondition(indicatorValue: any, condition: any): boolean {
  if (typeof condition === 'object' && condition !== null) {
    if ('gt' in condition && !(indicatorValue > condition.gt)) return false;
    if ('gte' in condition && !(indicatorValue >= condition.gte)) return false;
    if ('lt' in condition && !(indicatorValue < condition.lt)) return false;
    if ('lte' in condition && !(indicatorValue <= condition.lte)) return false;
    if ('eq' in condition && !(indicatorValue === condition.eq)) return false;
    if ('neq' in condition && !(indicatorValue !== condition.neq)) return false;
    return true;
  } else {
    return indicatorValue === condition;
  }
}

export function evaluateScanLogic(
  scanLogic: ScanLogic,
  indicators: IndicatorResults,
  verbose = false
): boolean {
  for (const key in scanLogic) {
    const logicValue = scanLogic[key];

    // Custom named condition logic
    if (key in scanConditions) {
      const checkFn = scanConditions[key];
      const passed = checkFn(indicators, scanLogic);
      if (!passed) return false;
      continue;
    }

    // Direct comparison to calculated indicators
    if (!(key in indicators)) {
      if (verbose) console.warn(`⚠️ Key "${key}" not found in indicators. Skipping scan.`);
      return false;
    }

    const indicatorValue = indicators[key];
    if (!evaluateCondition(indicatorValue, logicValue)) {
      return false;
    }
  }

  return true;
}
