import { config as loadEnv } from 'dotenv';

/**
 * Integration tests never touch the development database: they run against a
 * sibling database (`<name>_test`), or against `TEST_DATABASE_URL` when set.
 */
export function testDatabaseUrl(): string {
  loadEnv({ path: '.env' });
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  if (!process.env.DATABASE_URL) return '';
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = `${url.pathname.replace(/\/+$/, '')}_test`;
  return url.toString();
}
