import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from './generated/prisma/client.js';
import { appendAuditRecord } from './audit.js';

export type AuthPrincipal = {
  userId: string; email: string; role: 'PATIENT' | 'CLINICIAN' | 'ADMIN';
  sessionId: string; expiresAt: Date;
};

/** Authentication-only persistence; no client exposure or authorization policy. */
export function createAuthPersistence(connectionString: string | undefined) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 4 });
  pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  return {
    async credentials(email: string) {
      return client.user.findUnique({ where: { email }, select: {
        id: true, passwordHash: true, status: true,
      } });
    },
    async resolve(tokenHash: string): Promise<AuthPrincipal | null> {
      const rows = await client.$queryRaw<AuthPrincipal[]>`
        SELECT u.id AS "userId", u.email, u.role, s.id AS "sessionId", s.expires_at AS "expiresAt"
        FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ${tokenHash} AND s.revoked_at IS NULL
          AND s.expires_at > clock_timestamp() AND u.status = 'ACTIVE'`;
      return rows[0] ?? null;
    },
    async createSession(input: { userId: string; verifiedHash: string; tokenHash: string; previousHash: string | null }): Promise<AuthPrincipal | null> {
      return client.$transaction(async tx => {
        // Serializes status/hash writes while remaining compatible with audit FK KEY SHARE.
        await tx.$queryRaw`SELECT id FROM users WHERE id = ${input.userId}::uuid FOR NO KEY UPDATE`;
        const user = await tx.user.findUnique({ where: { id: input.userId } });
        if (!user || user.status !== 'ACTIVE' || user.passwordHash !== input.verifiedHash) return null;
        if (input.previousHash) {
          // Serialize revocation and audit insertion under concurrent relogin/logout.
          await tx.$queryRaw`SELECT id FROM sessions WHERE token_hash = ${input.previousHash} FOR UPDATE`;
        }
        const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp()::timestamptz(3) AS now`;
        if (input.previousHash) {
          const previous = await tx.session.findUnique({ where: { tokenHash: input.previousHash } });
          if (previous) {
            const revoked = await tx.session.updateMany({ where: {
              id: previous.id, revokedAt: null, expiresAt: { gt: now }, user: { status: 'ACTIVE' },
            }, data: { revokedAt: now } });
            if (revoked.count === 1) await appendAuditRecord(tx, {
              actorUserId: previous.userId, actionType: 'AUTH_SESSION_REVOKED', entityType: 'session', entityId: previous.id,
            });
          }
        }
        const session = await tx.session.create({ data: {
          userId: user.id, tokenHash: input.tokenHash, createdAt: now,
          expiresAt: new Date(now.getTime() + 28800 * 1000),
        } });
        await appendAuditRecord(tx, { actorUserId: user.id, actionType: 'AUTH_LOGIN', entityType: 'session', entityId: session.id });
        return { userId: user.id, email: user.email, role: user.role, sessionId: session.id, expiresAt: session.expiresAt };
      });
    },
    async revoke(tokenHash: string): Promise<boolean> {
      return client.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM sessions WHERE token_hash = ${tokenHash} FOR UPDATE`;
        const session = await tx.session.findUnique({ where: { tokenHash } });
        if (!session) return false;
        const [{ now }] = await tx.$queryRaw<{ now: Date }[]>`SELECT clock_timestamp()::timestamptz(3) AS now`;
        const result = await tx.session.updateMany({ where: {
          id: session.id, revokedAt: null, expiresAt: { gt: now }, user: { status: 'ACTIVE' },
        }, data: { revokedAt: now } });
        if (result.count !== 1) return false;
        await appendAuditRecord(tx, { actorUserId: session.userId, actionType: 'AUTH_SESSION_REVOKED', entityType: 'session', entityId: session.id });
        return true;
      });
    },
    async close(): Promise<void> { await client.$disconnect(); await pool.end(); },
  };
}
export type AuthPersistence = ReturnType<typeof createAuthPersistence>;
