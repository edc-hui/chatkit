import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
  resolve: {
    alias: {
      '@kweaver-ai/chatkit-core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
      '@kweaver-ai/chatkit-provider-dip': fileURLToPath(new URL('../../packages/provider-dip/src/index.ts', import.meta.url)),
      '@kweaver-ai/chatkit-shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 3100,
  },
});