import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { testDatabaseUrl } from './testDatabaseUrl';

/**
 * Creates the test database if it does not exist and brings it up to date with
 * the migrations. Failures are reported but not fatal — the integration suites
 * detect an unreachable database and skip themselves.
 */
export default async function globalSetup() {
  const url = testDatabaseUrl();
  if (!url) {
    console.warn('[tests] No DATABASE_URL — integration tests will be skipped.');
    return;
  }

  const target = new URL(url);
  const databaseName = decodeURIComponent(target.pathname.replace(/^\//, ''));
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';

  const admin = new PrismaClient({ datasources: { db: { url: adminUrl.toString() } } });
  try {
    await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
    console.log(`[tests] Created test database "${databaseName}".`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!/already exists/i.test(message)) {
      console.warn(`[tests] Could not create test database: ${message.split('\n')[0]}`);
      await admin.$disconnect().catch(() => undefined);
      return;
    }
  } finally {
    await admin.$disconnect().catch(() => undefined);
  }

  try {
    execSync('npx prisma migrate deploy --schema ../../prisma/schema.prisma', {
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: url },
    });
  } catch (err) {
    console.warn(`[tests] prisma migrate deploy failed: ${(err as Error).message.split('\n')[0]}`);
  }
}
