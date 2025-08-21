/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_STRIPE_PUBLIC_KEY: string;

  // ✅ Polygon key for candle data
  readonly VITE_POLYGON_API_KEY: string;

  // ❌ Alpaca keys (delete these if not using anymore)
  // readonly VITE_ALPACA_KEY?: string;
  // readonly VITE_ALPACA_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
