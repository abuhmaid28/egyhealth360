import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from './generated/prisma/client.js';

export function createDatabase(connectionString: string | undefined) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, query_timeout: 3000, statement_timeout: 3000, max: 4 });
  // Driver errors are handled by readiness checks, never exposed in logs.
  pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  return {
    async check(): Promise<void> { await client.$queryRaw`SELECT 1`; },
    async close(): Promise<void> { await client.$disconnect(); await pool.end(); },
  };
}
export type Database = ReturnType<typeof createDatabase>;

export { canonicalizeEmail, createPersistence } from './persistence.js';
export type { CreateUserInput, AppendAuditInput } from './persistence.js';
export { createAuthPersistence } from './auth.js';
export type { AuthPersistence, AuthPrincipal } from './auth.js';
