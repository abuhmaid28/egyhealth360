import type { PrismaClient } from './generated/prisma/client.js';

export type AppendAuditInput = {
  actorUserId: string | null;
  actionType: string;
  entityType: string;
  entityId: string;
  safeMetadata?: Record<string, never>;
};

/** Shared validation on ordinary and transaction-local append paths. */
export function appendAuditRecord(client: Pick<PrismaClient, 'auditLog'>, input: AppendAuditInput) {
  const metadata = input.safeMetadata === undefined ? {} : input.safeMetadata;
  if (input.actorUserId === undefined || metadata === null || typeof metadata !== 'object'
    || Array.isArray(metadata) || Object.keys(metadata).length !== 0) {
    throw new Error('Audit requires an explicit actor and empty safe metadata');
  }
  return client.auditLog.create({ data: {
    actorUserId: input.actorUserId, actionType: input.actionType,
    entityType: input.entityType, entityId: input.entityId, safeMetadata: {},
  } });
}
