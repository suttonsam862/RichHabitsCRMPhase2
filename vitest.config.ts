import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '*.config.ts',
        '**/*.d.ts',
        'tests/**',
        'scripts/**',
        'server/vite.ts',
        'client/src/main.tsx'
      ],
      include: [
        'server/**/*.{ts,js}',
        'client/src/**/*.{ts,tsx,js,jsx}',
        'shared/**/*.{ts,js}'
      ],
      thresholds: {
        branches: 75,
        functions: 80,
        lines: 80,
        statements: 80
      },
      all: true,
      skipFull: false
    },
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client', 'src'),
      '@shared': path.resolve(__dirname, 'shared'),
      '@server': path.resolve(__dirname, 'server'),
    },
  },
});