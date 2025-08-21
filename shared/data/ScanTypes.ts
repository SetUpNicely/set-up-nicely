// 📁 shared/data/ScanTypes.ts

import { Timeframe } from './Timeframe';

export type ScanDirection = 'bullish' | 'bearish';

export interface PresetScanDefinition {
  id: string;
  name: string;
  description: string;
  timeframe: Timeframe;
  direction: ScanDirection;
  logic: Record<string, any>;
  tier: 'free' | 'paid' | 'pro';

  // Optional fields used by frontend or enriched backend scoring
  pvsScore?: number;
  confidenceScore?: number;
  sectorStrength?: number;
  sectorHotToday?: boolean;
}

export interface CustomScanDefinition {
  id: string;
  name: string;
  description?: string;
  timeframe: Timeframe;
  logic: Record<string, any>;
  direction?: ScanDirection;
}

export interface ScanMatchResult {
  symbol: string;
  scanId: string;
  scanName?: string;
  timeframe: Timeframe;
  timestamp: number;
  triggered: boolean;
  direction: ScanDirection;
  pvsScore: number;
  confidenceScore?: number;
  sectorHotToday?: boolean;
}
