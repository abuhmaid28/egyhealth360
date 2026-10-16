import { Controller, Get, Post, Req, Res, UseGuards, HttpException } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ClinicalEvidenceError, evidenceKeys, evidenceValues, type AuthPrincipal, type PatientProfileId, type FollowUpAppointmentId, type ClinicalEncounterId, type BloodPressureMeasurementId, type FollowUpAppointmentPersistence, type ClinicalEncounterPersistence, type FollowUpAppointmentSnapshot, type ClinicalEncounterSnapshot, type EncounterBloodPressureAssociationSnapshot } from '@egyhealth/db';
import { authError, SessionAuthenticator, SessionAuthGuard, CsrfGuard, verifyOrigin, requireJson, sessionCookie, type AuthRuntime } from './auth.js';
import { parsePatientProfileId } from './authorization.js';
import { parseBloodPressurePage } from './blood-pressure.js';
type Request = IncomingMessage & { body?: unknown; principal?: AuthPrincipal; params: Record<string, string | undefined> };
type Kind = 'appointment' | 'encounter';
const invalid = () => authError(400, 'REQUEST_INVALID', 'Invalid request.');
/** Only EH-012's two-string creation bodies and empty mutation bodies. Grammar is
 * validated before scanning string tokens; escaped duplicate keys remain visible.
 * This never replaces the global parser or EH-011's numeric-token boundary. */
export function parseFollowupJson(raw: string, kind: Kind, create: boolean) {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw invalid(); }
  const keys = create ? [kind === 'appointment' ? 'scheduledAt' : 'occurredAt', 'purpose'] : [];
  evidenceKeys(parsed, keys);
  if (create) {
    const seen = new Set<string>();
    // JSON grammar distinguishes keys (a string followed by :) from string values.
    // Nested objects are invalid field values; their duplicate keys also fail closed.
    for (const token of raw.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
      if (!/^[ \t\r\n]*:/.test(raw.slice(token.index + token[0].length))) continue;
      const key: string = JSON.parse(token[0]);
      if (seen.has(key)) throw invalid();
      seen.add(key);
    }
    evidenceValues(kind, parsed);
  }
  return parsed;
}
function failure(error: unknown, kind: Kind) {
  if (error instanceof HttpException) return error;
  if (error instanceof ClinicalEvidenceError) {
    if (error.code === 'REQUEST_INVALID') return invalid();
    if (error.code === 'EVIDENCE_UNAUTHENTICATED') return authError(401, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
    if (error.code === 'EVIDENCE_NOT_FOUND') return authError(404, 'PATIENT_NOT_FOUND', 'Not found.');
    if (error.code === 'ENCOUNTER_BP_CONFLICT') return authError(409, 'ENCOUNTER_BP_CONFLICT', 'Association conflict.');
    if (['FOLLOW_UP_APPOINTMENT_INVALID', 'CLINICAL_ENCOUNTER_INVALID'].includes(error.code)) return new HttpException({ error: { code: error.code, message: kind === 'appointment' ? 'Invalid follow-up appointment.' : 'Invalid clinical encounter.', fields: error.fields } }, 400);
  }
  return authError(503, kind === 'appointment' ? 'FOLLOW_UP_SERVICE_UNAVAILABLE' : 'CLINICAL_ENCOUNTER_SERVICE_UNAVAILABLE', 'Service unavailable.');
}
function respond(request: Request, response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status; response.setHeader('Content-Type', 'application/json');
  // Avoid Express's automatic ETags/conditional 304 responses, including HEAD.
  response.end(request.method === 'HEAD' ? undefined : JSON.stringify(body));
}
export function followupRequestBoundary(auth: AuthRuntime) {
  return (request: Request, response: ServerResponse, next: (error?: unknown) => void) => {
    const path = request.url?.split('?', 1)[0] ?? '';
    const appointment = /^\/api\/v1\/patients\/[^/]+\/follow-up-appointments(?:\/[^/]+\/cancel)?\/?$/i.test(path);
    const encounter = /^\/api\/v1\/patients\/[^/]+\/clinical-encounters(?:\/[^/]+\/(?:blood-pressure-associations|blood-pressure-measurements\/[^/]+))?\/?$/i.test(path);
    if (!appointment && !encounter) return next();
    const kind: Kind = appointment ? 'appointment' : 'encounter';
    response.setHeader('Cache-Control', 'no-store');
    // Rewrite encoded targets before Express parameter decoding so the session guard
    // and uniform malformed-target denial apply even to invalid escape sequences.
    const segments = path.split('/');
    for (const i of [4, 6, 8]) if (segments[i]?.includes('%')) segments[i] = 'invalid-target';
    request.url = segments.join('/') + ((request.url ?? '').includes('?') ? (request.url ?? '').slice((request.url ?? '').indexOf('?')) : '');
    const collection = segments.length === (path.endsWith('/') ? 7 : 6);
    const associationRead = /\/blood-pressure-associations\/?$/i.test(path);
    const allowed = collection ? ['GET', 'HEAD', 'POST'] : associationRead ? ['GET', 'HEAD'] : ['POST'];
    const reject = (error: unknown) => { const e = failure(error, kind); respond(request, response, e.getStatus(), e.getResponse()); };
    if (!allowed.includes(request.method ?? '')) { response.setHeader('Allow', allowed.join(', ')); request.resume(); return reject(authError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.')); }
    if (request.method !== 'POST') return next();
    try {
      verifyOrigin(request, auth.config); requireJson(request);
      if (request.url.includes('?') || request.rawHeaders.some((v, i) => i % 2 === 0 && v.toLowerCase() === 'idempotency-key')) throw invalid();
      const encodings = request.rawHeaders.filter((v, i) => i % 2 === 0 && v.toLowerCase() === 'content-encoding').length;
      if (encodings > 1 || (request.headers['content-encoding'] !== undefined && request.headers['content-encoding'] !== 'identity')) throw authError(415, 'REQUEST_CONTENT_TYPE_INVALID', 'Unsupported content type.');
    } catch (error) { request.resume(); return reject(error); }
    void (async () => {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        size += chunk.length;
        if (size > 16384) { request.resume(); return reject(authError(413, 'REQUEST_TOO_LARGE', 'Request too large.')); }
        chunks.push(Buffer.from(chunk));
      }
      let raw: string; try { raw = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)); } catch { throw invalid(); }
      request.body = parseFollowupJson(raw, kind, collection);
      next();
    })().catch(reject);
  };
}
function target(request: Request, name: string, position: number): string {
  const raw = request.url?.split('?', 1)[0].split('/')[position], id = parsePatientProfileId(raw);
  if (!id || id !== parsePatientProfileId(request.params[name])) throw authError(404, 'PATIENT_NOT_FOUND', 'Not found.');
  return id;
}
function readPage(request: Request) {
  if (request.body !== undefined || Number(request.headers['content-length'] ?? 0) > 0 || request.headers['transfer-encoding'] !== undefined) throw invalid();
  return parseBloodPressurePage(request.url ?? '');
}
const appointmentView = (r: FollowUpAppointmentSnapshot) => ({ id: r.id, patientId: r.patientId, scheduledAt: r.scheduledAt.toISOString(), purpose: r.purpose, status: r.status, createdAt: r.createdAt.toISOString(), cancelledAt: r.cancelledAt?.toISOString() ?? null });
const encounterView = (r: ClinicalEncounterSnapshot) => ({ id: r.id, patientId: r.patientId, occurredAt: r.occurredAt.toISOString(), purpose: r.purpose, createdAt: r.createdAt.toISOString() });
const associationView = (r: EncounterBloodPressureAssociationSnapshot) => ({ id: r.id, patientId: r.patientId, encounterId: r.encounterId, bloodPressureMeasurementId: r.bloodPressureMeasurementId, createdAt: r.createdAt.toISOString() });
export function followupController(auth: AuthRuntime, appointments: FollowUpAppointmentPersistence, encounters: ClinicalEncounterPersistence) {
  const session = new SessionAuthGuard(new SessionAuthenticator(auth)), csrf = new CsrfGuard(auth.config);
  async function call(request: Request, response: ServerResponse, kind: Kind, operation: () => Promise<{ status: number; body: unknown }>) {
    try { const result = await operation(); respond(request, response, result.status, result.body); } catch (error) {
      if (error instanceof ClinicalEvidenceError && error.code === 'EVIDENCE_UNAUTHENTICATED') response.setHeader('Set-Cookie', sessionCookie(auth.config, null));
      throw failure(error, kind);
    }
  }
  @Controller('patients')
  @UseGuards(session)
  class FollowupController {
    @Post(':patientId/follow-up-appointments')
    @UseGuards(csrf)
    createAppointment(@Req() request: Request, @Res() response: ServerResponse) {
      return call(request, response, 'appointment', async () => {
        const patientId = target(request, 'patientId', 4) as PatientProfileId;
        evidenceKeys(request.body, ['scheduledAt', 'purpose']);
        const row = await appointments.createFollowUpAppointment(request.principal!, { patientId, scheduledAt: request.body.scheduledAt as string, purpose: request.body.purpose as 'HTN_BP_FOLLOWUP' });
        return { status: 201, body: { data: appointmentView(row) } };
      });
    }
    @Get(':patientId/follow-up-appointments')
    listAppointments(@Req() request: Request, @Res() response: ServerResponse) {
      return call(request, response, 'appointment', async () => {
        const page = readPage(request), patientId = target(request, 'patientId', 4) as PatientProfileId;
        const result = await appointments.listFollowUpAppointments(request.principal!, { patientId, ...page });
        return { status: 200, body: { data: result.data.map(appointmentView), meta: result.meta } };
      });
    }
    @Post(':patientId/follow-up-appointments/:appointmentId/cancel')
    @UseGuards(csrf)
    cancelAppointment(@Req() request: Request, @Res() response: ServerResponse) {
      return call(request, response, 'appointment', async () => {
        evidenceKeys(request.body, []);
        const patientId = target(request, 'patientId', 4) as PatientProfileId, appointmentId = target(request, 'appointmentId', 6) as FollowUpAppointmentId;
        const result = await appointments.cancelFollowUpAppointment(request.principal!, { patientId, appointmentId });
        return { status: 200, body: { data: appointmentView(result.appointment) } };
      });
    }
    @Post(':patientId/clinical-encounters')
    @UseGuards(csrf)
    createEncounter(@Req() request: Request, @Res() response: ServerResponse) {
      return call(request, response, 'encounter', async () => {
        const patientId = target(request, 'patientId', 4) as PatientProfileId;
        evidenceKeys(request.body, ['occurredAt', 'purpose']);
        const row = await encounters.createClinicalEncounter(request.principal!, { patientId, occurredAt: request.body.occurredAt as string, purpose: request.body.purpose as 'HTN_BP_FOLLOWUP' });
        return { status: 201, body: { data: encounterView(row) } };
      });
    }
    @Get(':patientId/clinical-encounters')
    listEncounters(@Req() request: Request, @Res() response: ServerResponse) {
      return call(request, response, 'encounter', async () => {
        const page = readPage(request), patientId = target(request, 'patientId', 4) as PatientProfileId;
        const result = await encounters.listClinicalEncounters(request.principal!, { patientId, ...page });
        return { status: 200, body: { data: result.data.map(encounterView), meta: result.meta } };
      });
    }
    @Post(':patientId/clinical-encounters/:encounterId/blood-pressure-measurements/:measurementId')
    @UseGuards(csrf)
    associate(@Req() request: Request, @Res() response: ServerResponse) {
      return call(request, response, 'encounter', async () => {
        evidenceKeys(request.body, []);
        const patientId = target(request, 'patientId', 4) as PatientProfileId, encounterId = target(request, 'encounterId', 6) as ClinicalEncounterId, measurementId = target(request, 'measurementId', 8) as BloodPressureMeasurementId;
        const result = await encounters.associateBloodPressureMeasurement(request.principal!, { patientId, encounterId, measurementId });
        return { status: result.changed ? 201 : 200, body: { data: associationView(result.association) } };
      });
    }
    @Get(':patientId/clinical-encounters/:encounterId/blood-pressure-associations')
    listAssociations(@Req() request: Request, @Res() response: ServerResponse) {
      return call(request, response, 'encounter', async () => {
        const page = readPage(request), patientId = target(request, 'patientId', 4) as PatientProfileId, encounterId = target(request, 'encounterId', 6) as ClinicalEncounterId;
        const result = await encounters.listEncounterBloodPressureAssociations(request.principal!, { patientId, encounterId, ...page });
        return { status: 200, body: { data: result.data.map(associationView), meta: result.meta } };
      });
    }
  }
  return FollowupController;
}
