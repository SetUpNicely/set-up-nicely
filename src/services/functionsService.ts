// 📁 Location: /src/services/functionsService.ts

import { httpsCallable } from 'firebase/functions';
import { getFirebaseFunctions } from './firebase';

const functionsService = {
  // 🔹 Run a preset scan
  async runPresetScan(scanId: string) {
    const functions = await getFirebaseFunctions();
    const fn = httpsCallable(functions, 'runPresetScan');
    const result = await fn({ scanId });
    return result.data;
  },

  // 🔹 Backfill PVS for a specific scan
  async backfillPVS(scanId: string) {
    const functions = await getFirebaseFunctions();
    const fn = httpsCallable(functions, 'backfillPVS');
    const result = await fn({ scanId });
    return result.data;
  },

  // 🔹 Trigger update to trending sectors
  async updateTrendingSectors() {
    const functions = await getFirebaseFunctions();
    const fn = httpsCallable(functions, 'updateTrendingSectors');
    const result = await fn();
    return result.data;
  },

  // 🔹 Generic caller
  async callFunction(name: string, data: any = {}) {
    const functions = await getFirebaseFunctions();
    const fn = httpsCallable(functions, name);
    const result = await fn(data);
    return result.data;
  }
};

export default functionsService;
