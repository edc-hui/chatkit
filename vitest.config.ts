import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@kweaver-ai/chatkit-core': fileURLToPath(new URL('./packages/core/src/index.ts', import.meta.url)),
      '@kweaver-ai/chatkit-provider-coze': fileURLToPath(new URL('./packages/provider-coze/src/index.ts', import.meta.url)),
      '@kweaver-ai/chatkit-provider-dip': fileURLToPath(new URL('./packages/provider-dip/src/index.ts', import.meta.url)),
      '@kweaver-ai/chatkit-react': fileURLToPath(new URL('./packages/react/src/index.ts', import.meta.url)),
      '@kweaver-ai/chatkit-shared': fileURLToPath(new URL('./packages/shared/src/index.ts', import.meta.url)),
      '@kweaver-ai/chatkit-vue': fileURLToPath(new URL('./packages/vue/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['packages/**/*.test.ts', 'packages/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});