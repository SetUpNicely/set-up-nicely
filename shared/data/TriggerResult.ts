// 📁 @shared/data/TriggerResult.ts

/**
 * Structure of a scan trigger result.
 * Used for backend Firestore storage, PVS scoring, UI display, and journaling.
 */
export interface TriggerResult {
  /** ✅ Target move (e.g. 3%) was hit within the lookahead window */
  hit: boolean;

  /** ✅ Risk-reward ratio target was hit before stop */
  rrHit: boolean;

  /** ✅ Number of candles to reach target — lower is better */
  timeToTarget: number;

  /** ✅ Whether volume spike was detected on trigger */
  volumeSpike: boolean;

  /** ✅ Maximum % move from trigger candle during lookahead window (0–100 scaled) */
  continuation: number;

  /** ✅ 0–100 scaled score for move strength from baseline */
  moveScore: number;

  /** ✅ Trigger failed early (reverse to stop or invalidation) */
  falseSignal: boolean;

  /** ✅ Predictive Validity Score calculated from historical trigger performance */
  pvsScore: number;

  /** 🟡 Optional: True if ticker belongs to top 3 sectors today */
  sectorHotToday?: boolean;

  /** 🟡 Optional: Hybrid confidence score (PVS + sector weight) */
  confidenceScore?: number;

  /** 🟡 Optional: Timestamp of trigger (for sorting or journal linkage) */
  timestamp?: number;

  /** 🟡 Optional: Ticker symbol (used in UI, tagging, display) */
  symbol?: string;

  /** 🟡 Optional: Timeframe of the scan (e.g., "5m", "1h") */
  timeframe?: string;

  /** 🟡 Optional: ID of scan that triggered this result */
  scanId?: string;
}
