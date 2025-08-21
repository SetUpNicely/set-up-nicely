import { get, set, del, clear } from "idb-keyval";

// You can namespace keys with scan types or user ID if needed
const cacheService = {
  // Save data
  async setCache(key: string, value: any) {
    await set(key, value);
  },

  // Get cached data
  async getCache(key: string) {
    return await get(key);
  },

  // Delete a specific key
  async clearCache(key: string) {
    await del(key);
  },

  // Clear everything (for logout/debug use)
  async clearAll() {
    await clear();
  },
};

export default cacheService;
