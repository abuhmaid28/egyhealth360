import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthPrincipal, AuthorizationPersistence, PatientAccessEvidence, PatientProfileId, PatientProfileProjection } from '@egyhealth/db';
import { authError, SessionAuthenticator, SessionAuthGuard, sessionCookie, type AuthRuntime } from './auth.js';

export type PatientAccessAction = 'patient-profile:read';
export type PatientAccessDecision =
  | { kind: 'allowed'; profile: PatientProfileProjection }
  | { kind: 'unauthenticated' }
  | { kind: 'denied' };

export function parsePatientProfileId(value: unknown): PatientProfileId | null {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value.toLowerCase() as PatientProfileId : null;
}

export function evaluatePatientAccess(action: PatientAccessAction, evidence: PatientAccessEvidence): PatientAccessDecision {
  if (!evidence.sessionValid) return { kind: 'unauthenticated' };
  if (action !== 'patient-profile:read' || !evidence.principalConsistent || !evidence.profile) return { kind: 'denied' };
  return { kind: 'allowed', profile: evidence.profile };
}

type Request = IncomingMessage & { principal?: AuthPrincipal; body?: unknown; params: { patientId?: string } };

/** Before parsing; controller guards still enforce authorization on routed variants. */
export function patientRequestBoundary(request: IncomingMessage, response: ServerResponse, next: () => void) {
  // Express decodes parameters before guards and otherwise emits 400 on bad escapes.
  // Encoded targets are never valid: route them as an invalid literal so the actual
  // session guard runs before the controller's uniform malformed-target denial.
  const encodedTarget = /^(\/api\/v1\/patients\/)([^/]*%[^/]*)(\/profile\/?)(\?.*)?$/i.exec(request.url ?? '');
  if (encodedTarget) request.url = `${encodedTarget[1]}invalid-patient-id${encodedTarget[3]}${encodedTarget[4] ?? ''}`;
  let path = request.url?.split('?', 1)[0] ?? '';
  try { path = decodeURIComponent(path); } catch { /* malformed paths remain unmatched */ }
  if (/^\/api\/v1\/patients(?:\/|$)/i.test(path.replace(/\/{2,}/g, '/'))) response.setHeader('Cache-Control', 'no-store');
  next();
}

export function patientController(auth: AuthRuntime, store: AuthorizationPersistence) {
  const guard = new SessionAuthGuard(new SessionAuthenticator(auth));
  @Controller('patients')
  @UseGuards(guard)
  class PatientController {
    @Get(':patientId/profile')
    async profile(@Req() request: Request, @Res({ passthrough: true }) response: ServerResponse) {
      response.setHeader('Cache-Control', 'no-store');
      if (request.url?.includes('?') || request.body !== undefined
        || Number(request.headers['content-length'] ?? 0) > 0 || request.headers['transfer-encoding'] !== undefined) {
        throw authError(400, 'REQUEST_INVALID', 'Invalid request.');
      }
      const denied = () => authError(404, 'PATIENT_NOT_FOUND', 'Not found.');
      // Reject encoded target spellings even when Express decodes them to a valid UUID.
      const rawId = request.url?.split('?', 1)[0].split('/')[4];
      const patientId = parsePatientProfileId(rawId);
      if (!patientId || patientId !== parsePatientProfileId(request.params.patientId)) throw denied();
      let evidence: PatientAccessEvidence;
      try { evidence = await store.readPatientProfileAccess(request.principal!, { patientId }); }
      catch { throw authError(503, 'AUTHORIZATION_SERVICE_UNAVAILABLE', 'Service unavailable.'); }
      const decision = evaluatePatientAccess('patient-profile:read', evidence);
      if (decision.kind === 'unauthenticated') {
        response.setHeader('Set-Cookie', sessionCookie(auth.config, null));
        throw authError(401, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
      }
      if (decision.kind === 'denied') throw denied();
      return { data: { id: decision.profile.id, displayName: decision.profile.displayName } };
    }
  }
  return PatientController;
}
