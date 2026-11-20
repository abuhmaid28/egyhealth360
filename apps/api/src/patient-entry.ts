import { Controller, Get, Put, Post, Req, Res, UseGuards, HttpException } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PatientEntryError, registrationIdentity, profileValues, type AuthPrincipal, type PatientEntryPersistence } from '@egyhealth/db';
import { authError, verifyOrigin, requireJson, SessionAuthenticator, SessionAuthGuard, CsrfGuard, sessionCookie, type AuthRuntime } from './auth.js';
import { hashPassword } from './password.js';

type Request = IncomingMessage & { body?: unknown; principal?: AuthPrincipal };
const invalid = () => authError(400, 'REQUEST_INVALID', 'Invalid request.');
const busy = () => authError(429, 'REGISTRATION_BUSY', 'Registration temporarily unavailable.');
export const REGISTRATION_HEADER = 'x-eh-register';
export const REGISTRATION_HEADER_VALUE = '1';
export const REGISTRATION_ACK = { data: { accepted: true } } as const;

/** Fixed-memory global process-local window, deliberately not keyed by email or untrusted IP. */
export class RegistrationBudget {
  private start: number;
  private attempts = 0;
  private active = 0;
  constructor(private readonly now: () => number = () => performance.now()) { this.start = now(); }
  acquire(): () => void {
    const now = this.now();
    if (now - this.start >= 60000) { this.start = now; this.attempts = 0; }
    if (this.attempts >= 30) throw busy();
    this.attempts++;
    if (this.active >= 2) throw busy();
    this.active++;
    let released = false;
    return () => { if (!released) { released = true; this.active--; } };
  }
}
export type PatientEntryRuntime = { store: PatientEntryPersistence; budget: RegistrationBudget; hash: typeof hashPassword };
export function patientEntryRuntime(store: PatientEntryPersistence): PatientEntryRuntime { return { store, budget: new RegistrationBudget(), hash: hashPassword }; }
function failure(error: unknown) {
  if (error instanceof HttpException) return error;
  if (error instanceof PatientEntryError) {
    if (error.code === 'PATIENT_ENTRY_INVALID') return invalid();
    if (error.code === 'PATIENT_ENTRY_UNAUTHENTICATED') return authError(401, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
    if (error.code === 'PATIENT_ENTRY_NOT_FOUND') return authError(404, 'PATIENT_NOT_FOUND', 'Not found.');
  }
  return authError(503, 'PATIENT_ENTRY_UNAVAILABLE', 'Service unavailable.');
}
function respond(request: Request, response: ServerResponse, status: number, body: unknown) {
  response.statusCode = status; response.setHeader('Content-Type', 'application/json');
  response.end(request.method === 'HEAD' ? undefined : JSON.stringify(body));
}
/** Flat string/null bodies only; escaped duplicate keys and nested structures fail closed. */
export function parsePatientEntryJson(raw: string, registration: boolean) {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw invalid(); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid();
  const object = value as Record<string, unknown>;
  if (Object.values(object).some(v => typeof v !== 'string' && v !== null)) throw invalid();
  const seen = new Set<string>();
  for (const token of raw.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
    if (!/^[ \t\r\n]*:/.test(raw.slice(token.index + token[0].length))) continue;
    const key: string = JSON.parse(token[0]); if (seen.has(key)) throw invalid(); seen.add(key);
  }
  try {
    if (!registration) return profileValues(object);
    if (Object.keys(object).length !== 3 || !Object.hasOwn(object, 'password') || typeof object.password !== 'string') throw invalid();
    const identity = registrationIdentity({ email: object.email, displayName: object.displayName });
    if (Object.keys(object).some(k => !['email','password','displayName'].includes(k))) throw invalid();
    const size = Buffer.byteLength(object.password, 'utf8'); if (size < 1 || size > 1024) throw invalid();
    return { ...identity, password: object.password };
  } catch (error) { throw failure(error); }
}
export function registrationGuards(request: IncomingMessage, auth: AuthRuntime) {
  verifyOrigin(request, auth.config); requireJson(request);
  const headers = request.rawHeaders.filter((v, i) => i % 2 === 0 && v.toLowerCase() === REGISTRATION_HEADER);
  if (headers.length !== 1 || request.headers[REGISTRATION_HEADER] !== REGISTRATION_HEADER_VALUE) throw authError(403, 'AUTH_CSRF_INVALID', 'Request verification failed.');
}
export function patientEntryRequestBoundary(auth: AuthRuntime) {
  return (request: Request, response: ServerResponse, next: (error?: unknown) => void) => {
    const path = request.url?.split('?', 1)[0].toLowerCase().replace(/\/+$/, '');
    const registration = path === '/api/v1/auth/register';
    if (!registration && path !== '/api/v1/me/profile') return next();
    response.setHeader('Cache-Control', 'no-store');
    const reject = (error: unknown) => { const e = failure(error); respond(request, response, e.getStatus(), e.getResponse()); };
    const allowed = registration ? ['POST'] : ['GET', 'HEAD', 'PUT'];
    try {
      if (!allowed.includes(request.method ?? '')) { response.setHeader('Allow', allowed.join(', ')); throw authError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.'); }
      if (request.url?.includes('?') || request.rawHeaders.reduce((sum, v) => sum + Buffer.byteLength(v, 'utf8'), 0) > 8192) throw invalid();
      if (request.method === 'GET' || request.method === 'HEAD') {
        if (request.headers['transfer-encoding'] !== undefined || Number(request.headers['content-length'] ?? 0) > 0) throw invalid();
        return next();
      }
      if (registration) registrationGuards(request, auth); else { verifyOrigin(request, auth.config); requireJson(request); }
      const count = (name: string) => request.rawHeaders.filter((v,i) => i % 2 === 0 && v.toLowerCase() === name).length;
      if (count('content-encoding') > 1 || (request.headers['content-encoding'] !== undefined && request.headers['content-encoding'] !== 'identity')) throw authError(415, 'REQUEST_CONTENT_TYPE_INVALID', 'Unsupported content type.');
      if (count('idempotency-key')) throw invalid();
    } catch (error) { request.resume(); return reject(error); }
    void (async () => {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        size += chunk.length;
        if (size > 16384) { request.resume(); return reject(authError(413, 'REQUEST_TOO_LARGE', 'Request too large.')); }
        chunks.push(Buffer.from(chunk));
      }
      let raw: string;
      try { raw = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)); } catch { throw invalid(); }
      request.body = parsePatientEntryJson(raw, registration);
      next();
    })().catch(reject);
  };
}
export function patientEntryController(auth: AuthRuntime, runtime: PatientEntryRuntime) {
  const session = new SessionAuthGuard(new SessionAuthenticator(auth)), csrf = new CsrfGuard(auth.config);
  async function own(request: Request, response: ServerResponse, update: boolean) {
    try {
      const data = update ? await runtime.store.replaceOwnProfile(request.principal!, profileValues(request.body)) : await runtime.store.readOwnProfile(request.principal!);
      respond(request, response, 200, { data });
    } catch (error) {
      if (error instanceof PatientEntryError && error.code === 'PATIENT_ENTRY_UNAUTHENTICATED') response.setHeader('Set-Cookie', sessionCookie(auth.config, null));
      throw failure(error);
    }
  }
  @Controller()
  class PatientEntryController {
    @Post('auth/register')
    async register(@Req() request: Request, @Res() response: ServerResponse) {
      // Anonymous even when a browser supplies an existing session. Never resolve/replace that session.
      registrationGuards(request, auth);
      const body = request.body as { email: string; displayName: string; password: string };
      const release = runtime.budget.acquire();
      const password = Buffer.from(body.password, 'utf8');
      try {
        const passwordHash = await runtime.hash(password);
        // Release request reference promptly; Buffer is wiped even on crypto/persistence failure.
        request.body = undefined;
        await runtime.store.register({ email: body.email, displayName: body.displayName, passwordHash });
        respond(request, response, 202, REGISTRATION_ACK);
      } catch (error) { throw failure(error); }
      finally { password.fill(0); release(); }
    }
    @Get('me/profile')
    @UseGuards(session)
    read(@Req() request: Request, @Res() response: ServerResponse) { return own(request, response, false); }
    @Put('me/profile')
    @UseGuards(session, csrf)
    update(@Req() request: Request, @Res() response: ServerResponse) { return own(request, response, true); }
  }
  return PatientEntryController;
}
