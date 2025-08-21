// 📁 /src/data/JournalTypes.ts

export interface JournalEntry {
  id: string; // ✅ make required
  symbol: string;
  scanName: string;
  scanId?: string;
  pvsScore?: number;
  sectorStrength?: number;
  entryPrice: string;
  exitPrice: string;
  gainLossPercent: number | null;
  gainLossDollar: number | null;
  outcome: 'win' | 'loss' | '';
  notes?: string;
  emotions?: string;
  whatWorked?: string;
  whatDidnt?: string;
  tags: string[];
  createdAt: number;
  timestamp: number; // ✅ required for consistency
}
