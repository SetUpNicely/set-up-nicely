// highlightScans.ts

import { TriggerResult } from '../../../shared/data/TriggerResult.js'

/**
 * TriggerWithMeta includes the core trigger fields plus symbol metadata.
 */
export interface TriggerWithMeta extends TriggerResult {
  symbol: string
  scanId: string
  timeframe: string
  timestamp: number
}

/**
 * Options for highlight filtering and sorting.
 */
interface HighlightOptions {
  limit?: number
  minPVS?: number
  filterByTimeframe?: string // e.g., '1d', '15m'
  includeReason?: boolean // <-- NEW: enables downstream display
}

/**
 * Picks top triggers based on PVS score and optional filters.
 */
export function selectTopHighlights(
  triggers: TriggerWithMeta[],
  options: HighlightOptions = {}
): TriggerWithMeta[] {
  const {
    limit = 10,
    minPVS = 60,
    filterByTimeframe,
    includeReason = false,
  } = options

  const filtered = triggers
    .filter((t) => t.pvsScore !== undefined && t.pvsScore >= minPVS)
    .filter((t) =>
      filterByTimeframe ? t.timeframe === filterByTimeframe : true
    )
    .sort((a, b) => b.pvsScore! - a.pvsScore!)

  return filtered.slice(0, limit).map((t, i) => ({
    ...t,
    ...(includeReason && {
      highlightRank: i + 1,
      highlightReason: 'High PVS',
    }),
  }))
}
