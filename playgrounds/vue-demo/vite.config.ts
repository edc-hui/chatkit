import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@kweaver-ai/chatkit-core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
      '@kweaver-ai/chatkit-provider-dip': fileURLToPath(new URL('../../packages/provider-dip/src/index.ts', import.meta.url)),
      '@kweaver-ai/chatkit-vue': fileURLToPath(new URL('../../packages/vue/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 3102,
  },
});
