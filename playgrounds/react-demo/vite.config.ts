import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@kweaver-ai/chatkit-core': fileURLToPath(new URL('../../packages/core/src/index.ts', import.meta.url)),
      '@kweaver-ai/chatkit-provider-dip': fileURLToPath(new URL('../../packages/provider-dip/src/index.ts', import.meta.url)),
      '@kweaver-ai/chatkit-react': fileURLToPath(new URL('../../packages/react/src/index.ts', import.meta.url)),
      '@kweaver-ai/chatkit-shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 3101,
    proxy: {
      '/api': {
        target: 'https://dip.aishu.cn',
        changeOrigin: true,
      },
    },
  },
});
