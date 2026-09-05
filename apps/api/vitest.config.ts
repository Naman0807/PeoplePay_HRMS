import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './tests/testDatabaseUrl';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/globalSetup.ts'],
    // Integration tests share one database, so files must not run in parallel.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDatabaseUrl(),
      JWT_SECRET: process.env.JWT_SECRET || 'test-secret',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    },
  },
});
