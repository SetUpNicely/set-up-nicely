// 📁 /shared/logic/expectedMoves.ts

import { Timeframe } from '../data/Timeframe.js';

// Revised: More conservative expected move targets per timeframe
export const expectedMoves: Record<Timeframe, number> = {
  '1m': 0.0025,   // 0.25%
  '5m': 0.005,    // 0.50%
  '15m': 0.009,   // 0.90%
  '30m': 0.013,   // 1.30%
  '1h': 0.017,    // 1.70%
  '4h': 0.025,    // 2.50%
  'D': 0.035,     // 3.50%
  'W': 0.065,     // 6.50%
};
