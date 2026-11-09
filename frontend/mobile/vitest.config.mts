import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: '../../coverage/mobile',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/money.ts'],
    },
  },
});
