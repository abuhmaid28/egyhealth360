import { Controller, Get, Post, HttpCode, Req, Res, UseGuards, HttpException } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { BloodPressureError, bpInvalid, exactBpKeys, validateBpValues, type AuthPrincipal, type BloodPressureMeasurementPersistence, type BloodPressureMeasurementSnapshot } from '@egyhealth/db';
import { authError, SessionAuthenticator, SessionAuthGuard, CsrfGuard, verifyOrigin, requireJson, sessionCookie, type AuthRuntime } from './auth.js';
import { parsePatientProfileId } from './authorization.js';
type Request = IncomingMessage & { body?: unknown; principal?: AuthPrincipal; params: { patientId?: string } };

/** Only the flat EH-011 POST body. JSON.parse establishes grammar; this bounded
 * token scan preserves duplicate keys and validates numeric spellings before accepting converted values.
 * It is never installed as the repository-wide JSON parser. */
export function parseBloodPressureJson(raw: string) {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw authError(400, 'REQUEST_INVALID', 'Invalid request.'); }
  exactBpKeys(parsed, ['systolic', 'diastolic', 'unit', 'measuredAt']);
  // JSON grammar already rejects literal controls; exclude them in string tokens too.
  // eslint-disable-next-line no-control-regex
  const token = /\s*("(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"|true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?|[{}:,])/y;
  let position = 0;
  const take = () => { token.lastIndex = position; const m = token.exec(raw); if (!m) bpInvalid('$', 'type'); position = token.lastIndex; return m[1]; };
  if (take() !== '{') bpInvalid('$', 'type');
  const seen = new Set<string>();
  while (true) {
    const keyToken = take();
    if (!keyToken.startsWith('"')) bpInvalid('$', 'type');
    const key: string = JSON.parse(keyToken);
    if (seen.has(key)) bpInvalid('$', 'representation');
    seen.add(key);
    if (take() !== ':') bpInvalid('$', 'type');
    const value = take();
    if ((key === 'systolic' || key === 'diastolic') && !/^(?:0|-?[1-9][0-9]*)$/.test(value)) bpInvalid(key, 'representation');
    if (value === '{' || value === '}') bpInvalid('$', 'type');
    const delimiter = take();
    if (delimiter === '}') break;
    if (delimiter !== ',') bpInvalid('$', 'type');
  }
  if (raw.slice(position).trim() !== '') bpInvalid('$', 'type');
  validateBpValues(parsed);
  return parsed;
}
function httpFailure(error: unknown): HttpException {
  if (error instanceof HttpException) return error;
  if (error instanceof BloodPressureError) {
    if (error.code === 'BP_MEASUREMENT_INVALID') return new HttpException({ error: { code: error.code, message: 'Invalid blood pressure measurement.', fields: error.fields } }, 400);
    if (error.code === 'BP_UNAUTHENTICATED') return authError(401, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
    if (error.code === 'BP_NOT_FOUND') return authError(404, 'PATIENT_NOT_FOUND', 'Not found.');
  }
  return authError(503, 'BP_SERVICE_UNAVAILABLE', 'Service unavailable.');
}
export function bloodPressureRequestBoundary(auth: AuthRuntime) {
  return (request: Request, response: ServerResponse, next: (error?: unknown) => void) => {
    const encoded = /^(\/api\/v1\/patients\/)([^/]*%[^/]*)(\/blood-pressure-measurements\/?)(\?.*)?$/i.exec(request.url ?? '');
    if (encoded) request.url = `${encoded[1]}invalid-patient-id${encoded[3]}${encoded[4] ?? ''}`;
    if (!/^\/api\/v1\/patients\/[^/]+\/blood-pressure-measurements\/?(?:\?.*)?$/i.test(request.url ?? '')) return next();
    response.setHeader('Cache-Control', 'no-store');
    const reject = (error: unknown) => { const failure = httpFailure(error); response.statusCode = failure.getStatus(); response.setHeader('Content-Type', 'application/json'); response.end(request.method === 'HEAD' ? undefined : JSON.stringify(failure.getResponse())); };
    if (!['POST', 'GET', 'HEAD'].includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, HEAD, POST'); return reject(authError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.'));
    }
    if (request.method !== 'POST') return next();
    try {
      verifyOrigin(request, auth.config); requireJson(request);
      if (request.url?.includes('?') || request.rawHeaders.some((v, i) => i % 2 === 0 && v.toLowerCase() === 'idempotency-key')) throw authError(400, 'REQUEST_INVALID', 'Invalid request.');
      if (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity') throw authError(415, 'REQUEST_CONTENT_TYPE_INVALID', 'Unsupported content type.');
    } catch (error) { request.resume(); return reject(error); }
    // Consume only this route, before the unchanged global parser. Do not retain payloads.
    void (async () => {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        size += chunk.length;
        if (size > 16384) { request.resume(); reject(authError(413, 'REQUEST_TOO_LARGE', 'Request too large.')); return; }
        chunks.push(Buffer.from(chunk));
      }
      request.body = parseBloodPressureJson(Buffer.concat(chunks).toString('utf8'));
      next();
    })().catch(reject);
  };
}
function projection(row: BloodPressureMeasurementSnapshot) {
  return { id: row.id, patientId: row.patientId, systolic: row.systolic, diastolic: row.diastolic, unit: row.unit,
    measuredAt: row.measuredAt.toISOString(), createdAt: row.createdAt.toISOString(), sourceKind: row.sourceKind };
}
function target(request: Request) {
  const id = parsePatientProfileId(request.url?.split('?', 1)[0].split('/')[4]);
  if (!id || id !== parsePatientProfileId(request.params.patientId)) throw authError(404, 'PATIENT_NOT_FOUND', 'Not found.');
  return id;
}
export function parseBloodPressurePage(url: string) {
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : undefined;
  if (query === '') throw authError(400, 'REQUEST_INVALID', 'Invalid request.');
  const result = { page: 1, pageSize: 20 }, seen = new Set<string>();
  if (query !== undefined) for (const pair of query.split('&')) {
    const m = /^(page|pageSize)=([1-9][0-9]*)$/.exec(pair);
    if (!m || seen.has(m[1])) throw authError(400, 'REQUEST_INVALID', 'Invalid request.');
    seen.add(m[1]); const key = m[1] as keyof typeof result, n = Number(m[2]);
    if (!Number.isSafeInteger(n) || n > (key === 'page' ? 2147483647 : 100)) throw authError(400, 'REQUEST_INVALID', 'Invalid request.');
    result[key] = n;
  }
  return result;
}
export function bloodPressureController(auth: AuthRuntime, store: BloodPressureMeasurementPersistence) {
  const sessionGuard = new SessionAuthGuard(new SessionAuthenticator(auth)), csrf = new CsrfGuard(auth.config);
  async function call<T>(response: ServerResponse, operation: () => Promise<T>) {
    try { return await operation(); } catch (error) {
      if (error instanceof BloodPressureError && error.code === 'BP_UNAUTHENTICATED') response.setHeader('Set-Cookie', sessionCookie(auth.config, null));
      throw httpFailure(error);
    }
  }
  // End only BP responses directly: Express send/json would add ETags and
  // honor conditional freshness even with no-store. Other routes are unchanged.
  function respond(request: Request, response: ServerResponse, status: number, body: unknown) {
    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json');
    response.end(request.method === 'HEAD' ? undefined : JSON.stringify(body));
  }
  @Controller('patients')
  @UseGuards(sessionGuard)
  class BloodPressureController {
    @Post(':patientId/blood-pressure-measurements')
    @HttpCode(201)
    @UseGuards(csrf)
    async create(@Req() request: Request, @Res() response: ServerResponse) {
      const patientId = target(request);
      const body = await call(response, async () => {
        exactBpKeys(request.body, ['systolic', 'diastolic', 'unit', 'measuredAt']);
        const b = request.body;
        const row = await store.createBloodPressureMeasurement(request.principal!, { patientId, systolic: b.systolic as number, diastolic: b.diastolic as number, unit: b.unit as 'mmHg', measuredAt: b.measuredAt as string });
        return { data: projection(row) };
      });
      respond(request, response, 201, body);
    }
    @Get(':patientId/blood-pressure-measurements')
    async history(@Req() request: Request, @Res() response: ServerResponse) {
      if (request.body !== undefined || Number(request.headers['content-length'] ?? 0) > 0 || request.headers['transfer-encoding'] !== undefined) throw authError(400, 'REQUEST_INVALID', 'Invalid request.');
      const patientId = target(request), page = parseBloodPressurePage(request.url ?? '');
      const body = await call(response, async () => {
        const result = await store.listBloodPressureMeasurements(request.principal!, { patientId, ...page });
        return { data: result.measurements.map(projection), meta: { page: result.page, pageSize: result.pageSize, total: result.total } };
      });
      respond(request, response, 200, body);
    }
  }
  return BloodPressureController;
}
