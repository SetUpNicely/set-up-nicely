// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  base: '/', // Use '/' unless you're deploying to a subdirectory
  plugins: [react(), tsconfigPaths()],
});
