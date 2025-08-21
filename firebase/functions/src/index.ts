
// 📁 /firebase/functions/src/index.ts
console.log('✅ Loaded Cloud Functions index.ts');

// ✅ Firebase Function v2 imports
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { Request, Response } from 'express';

// ✅ Declare secret
const polygonApiKey = defineSecret('POLYGON_API_KEY');

// 🔁 Scheduled (cron) functions
export { buildAllowedTickers } from './schedule/buildAllowedTickers.js';
export { uploadYesterdayFlatFiles } from './schedule/uploadYesterdayFlatFiles.js';

// 🧠 Callable Functions for frontend
export { runCustomScan } from './handlers/runCustomScan.js';
export { savePushToken } from './savePushToken.js';
export { getCandles } from './getCandles.js';

// 🌐 HTTP Function Handlers
import { runPresetScansHandler } from './manualRunPresetScans.js';
import { notifyWatchlist } from './notifyWatchlist.js';
import { polygonProxy } from './polygonProxy.js';
import { generateDailyHighlights as generateHighlightsHandler } from './generateHighlights.js';
import { backfillAllPVS } from './backfillAllPVS.js';

// ✅ Expose HTTP endpoints
export const runPresetScansFunction = onRequest(runPresetScansHandler);
export const notifyWatchlistFunction = onRequest(notifyWatchlist);
export const generateHighlightsFunction = onRequest(generateHighlightsHandler);
export { polygonProxy };

// ✅ Manual backfill trigger with secret
export const backfillAllPVSFunction = onRequest(
  {
    timeoutSeconds: 540,
    secrets: [polygonApiKey],
  },
  async (_req: Request, res: Response) => {
    try {
      await backfillAllPVS(polygonApiKey.value());
      res.status(200).send('✅ Backfill complete');
    } catch (err) {
      console.error('❌ Error in backfillAllPVS:', err);
      res.status(500).send('❌ Backfill failed');
    }
  }
);
