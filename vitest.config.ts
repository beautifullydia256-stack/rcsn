import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/features/visual-template-designer/__tests__/**/*.{test,spec}.{ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**', // Exclude E2E tests (run with Playwright)
      '**/*.spec.ts', // Exclude .spec.ts files (Playwright convention)
    ],
    setupFiles: ['./src/test-setup.ts'],
    // Property-based testing configuration
    // fast-check will run 100 iterations minimum per property test
    testTimeout: 10000, // Increased timeout for property-based tests
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
