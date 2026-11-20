import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from './generated/prisma/client.js';
import type { AuthPrincipal } from './auth.js';

export type PatientProfileId = string & { readonly __patientProfileId: unique symbol };
export type PatientAccessTarget = Readonly<{ patientId: PatientProfileId }>;
export type PatientProfileProjection = Readonly<{ id: PatientProfileId; displayName: string }>;
export type PatientAccessEvidence = Readonly<{
  sessionValid: boolean; principalConsistent: boolean; profile: PatientProfileProjection | null;
}>;

/** Only a scoped read: authorization and projection share one READ COMMITTED statement. */
export function createAuthorizationPersistence(connectionString: string | undefined) {
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 4 });
  pool.on('error', () => {});
  const client = new PrismaClient({ adapter: new PrismaPg(pool), log: [] });
  return {
    async readPatientProfileAccess(principal: AuthPrincipal, target: PatientAccessTarget): Promise<PatientAccessEvidence> {
      const rows = await client.$queryRaw<PatientAccessEvidence[]>`
        WITH actor AS (
          SELECT u.id, u.role FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.id = ${principal.sessionId}::uuid AND u.id = ${principal.userId}::uuid
            AND s.revoked_at IS NULL AND s.expires_at > clock_timestamp() AND u.status = 'ACTIVE'
        ), permitted AS (
          SELECT p.id, p.display_name AS "displayName"
          FROM patient_profiles p CROSS JOIN actor a
          WHERE p.id = ${target.patientId}::uuid AND a.role::text = ${principal.role}
            AND p.user_role = 'PATIENT' AND (
              (a.role = 'PATIENT' AND p.user_id = a.id)
              OR (a.role = 'CLINICIAN' AND EXISTS (
                SELECT 1 FROM clinician_profiles c
                JOIN clinician_patient_assignments r ON r.clinician_id = c.id
                WHERE c.user_id = a.id AND c.user_role = 'CLINICIAN'
                  AND r.patient_id = p.id AND r.status = 'ACTIVE' AND r.ended_at IS NULL
              ))
            )
        )
        SELECT EXISTS(SELECT 1 FROM actor) AS "sessionValid",
          EXISTS(SELECT 1 FROM actor WHERE role::text = ${principal.role}) AS "principalConsistent",
          (SELECT jsonb_build_object('id', id, 'displayName', "displayName") FROM permitted) AS profile`;
      return rows[0];
    },
    async close(): Promise<void> { await client.$disconnect(); await pool.end(); },
  };
}
export type AuthorizationPersistence = ReturnType<typeof createAuthorizationPersistence>;
