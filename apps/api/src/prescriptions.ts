import { Controller, Get, Post, Req, Res, Param, UseGuards, HttpException } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { PrescriptionError, prescriptionJson, availabilityId, type PrescriptionCommand, type PrescriptionPersistence, type AuthPrincipal } from '@egyhealth/db';
import { authError, verifyOrigin, requireJson, SessionAuthGuard, SessionAuthenticator, CsrfGuard, sessionCookie, type AuthRuntime } from './auth.js';
type Request = IncomingMessage & { body?: unknown; principal?: AuthPrincipal };
const invalid = () => authError(400, 'REQUEST_INVALID', 'Invalid request.');
const missing = () => authError(404, 'PRESCRIPTION_NOT_FOUND', 'Not found.');
function failure(e: unknown) {
  if (e instanceof HttpException) return e;
  if (e instanceof PrescriptionError) {
    if (e.code === 'PRESCRIPTION_INVALID') return invalid();
    if (e.code === 'PRESCRIPTION_UNAUTHENTICATED') return authError(401, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
    if (e.code === 'PRESCRIPTION_NOT_FOUND') return missing();
    if (e.code === 'PRESCRIPTION_CONFLICT') return authError(409, 'PRESCRIPTION_CONFLICT', 'Conflicting prescription operation.');
  }
  return authError(503, 'PRESCRIPTION_UNAVAILABLE', 'Service unavailable.');
}
function send(q: Request, s: ServerResponse, status: number, value: unknown) { s.statusCode = status; s.setHeader('Cache-Control', 'no-store'); s.setHeader('Content-Type', 'application/json'); s.end(q.method === 'HEAD' ? undefined : JSON.stringify(value)); }
export function prescriptionQuery(raw: string) {
  const query = raw.split('?')[1], out: Record<string,number> = {};
  if (query === undefined) return out;
  if (!query) throw invalid();
  for (const pair of query.split('&')) {
    const m = /^(page|pageSize)=([1-9][0-9]*)$/.exec(pair);
    if (!m || Object.hasOwn(out,m[1]) || Number(m[2]) > (m[1].endsWith('Size') ? 100 : 10000)) throw invalid();
    out[m[1]]=Number(m[2]);
  }
  return out;
}
const commands: Record<string,PrescriptionCommand> = {edits:'EDIT',sign:'SIGN',cancellations:'CANCEL',replacements:'REPLACE','privacy-restrictions':'PRIVACY'};
export function prescriptionRequestBoundary(auth: AuthRuntime) {
  return (q: Request, s: ServerResponse, next: (e?: unknown) => void) => {
    const raw = q.url ?? '', path = raw.split('?')[0]; let decoded = path; try { decoded = decodeURIComponent(path); } catch { /* no aliases */ }
    const normalized = decoded.toLowerCase().replace(/\/+$/, '');
    if (!/^\/api\/v1\/(?:consultations\/[^/]+\/prescriptions|me\/prescriptions|patients\/[^/]+\/prescriptions|medications)(?:\/|$)/.test(normalized)) return next();
    if (/^\/api\/v1\/consultations\/[^/]+\/prescriptions\/[^/]+\/pharmacy-routes(?:\/|$)/.test(normalized)) return next();
    s.setHeader('Cache-Control', 'no-store');
    const reject = (e: unknown) => { const x = failure(e); send(q, s, x.getStatus(), x.getResponse()); };
    let command: PrescriptionCommand | 'CATALOG' = 'DRAFT';
    try {
      if (Buffer.byteLength(raw) > 2048 || q.rawHeaders.reduce((n, v) => n + Buffer.byteLength(v), 0) > 8192) throw invalid();
      const author = /^\/api\/v1\/consultations\/([^/]+)\/prescriptions(?:\/([^/]+)(?:\/(edits|sign|cancellations|replacements|privacy-restrictions))?)?$/.exec(path);
      const released = /^\/api\/v1\/(?:me\/prescriptions|patients\/([^/]+)\/prescriptions)(?:\/([^/]+))?$/.exec(path);
      const catalog = /^\/api\/v1\/medications(?:\/([^/]+)\/settings)?$/.exec(path);
      if (path !== normalized || path.includes('%') || !author && !released && !catalog) throw missing();
      for (const id of author ? [author[1], author[2]] : catalog ? [catalog[1]] : [released![1], released![2]]) if (id !== undefined) { try { availabilityId(id); } catch { throw missing(); } }
      const list = catalog ? !catalog[1] : author ? !author[2] : !released![2];
      const methods = catalog?.[1] ? ['POST'] : author?.[3] ? ['POST'] : author && list ? ['GET', 'HEAD', 'POST'] : ['GET', 'HEAD'];
      if (!methods.includes(q.method ?? '')) { s.setHeader('Allow', methods.join(', ')); throw authError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.'); }
      if (q.method === 'GET' || q.method === 'HEAD') {
        if (q.headers['transfer-encoding'] !== undefined || Number(q.headers['content-length'] ?? 0) > 0) throw invalid();
        prescriptionQuery(raw); return next();
      }
      if (raw.includes('?')) throw invalid();
      verifyOrigin(q, auth.config); requireJson(q);
      const count = (name: string) => q.rawHeaders.filter((v, i) => i % 2 === 0 && v.toLowerCase() === name).length;
      if (count('idempotency-key')) throw invalid();
      if (count('content-encoding') > 1 || q.headers['content-encoding'] !== undefined && q.headers['content-encoding'] !== 'identity') throw authError(415, 'REQUEST_CONTENT_TYPE_INVALID', 'Unsupported content type.');
      command = catalog ? 'CATALOG' : author?.[3] ? commands[author[3]] : 'DRAFT';
    } catch (e) { q.resume(); return reject(e); }
    void (async () => {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of q.iterator({ destroyOnReturn: false })) { size += chunk.length; if (size > 16384) { q.resume(); return reject(authError(413, 'REQUEST_TOO_LARGE', 'Request too large.')); } chunks.push(Buffer.from(chunk)); }
      let raw: string; try { raw = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)); } catch { throw invalid(); }
      q.body = prescriptionJson(raw, command); next();
    })().catch(reject);
  };
}
export function prescriptionController(auth: AuthRuntime, store: PrescriptionPersistence) {
  const session = new SessionAuthGuard(new SessionAuthenticator(auth)), csrf = new CsrfGuard(auth.config);
  async function invoke(q: Request, s: ServerResponse, op: () => Promise<unknown>) { try { const result=await op() as {status?:number}; const {status=200,...body}=result; send(q,s,status,body); } catch (e) { if (e instanceof PrescriptionError && e.code === 'PRESCRIPTION_UNAUTHENTICATED') s.setHeader('Set-Cookie', sessionCookie(auth.config, null)); throw failure(e); } }
  @Controller()
  class PrescriptionController {
    @Get('medications') @UseGuards(session)
    catalog(@Req() q: Request,@Res() s: ServerResponse) {return invoke(q,s,()=>store.catalogRead(q.principal!,prescriptionQuery(q.url!)));}
    @Post('medications/:medicationId/settings') @UseGuards(session,csrf)
    settings(@Req() q: Request,@Res() s: ServerResponse,@Param('medicationId') id:string) {return invoke(q,s,()=>store.catalogSet(q.principal!,{...q.body as object,medicationId:id}));}
    @Post('consultations/:consultationId/prescriptions') @UseGuards(session, csrf)
    draft(@Req() q: Request, @Res() s: ServerResponse, @Param('consultationId') id: string) { return invoke(q, s, () => store.execute('DRAFT', q.principal!, { ...q.body as object, consultationId: id })); }
    @Get('consultations/:consultationId/prescriptions') @UseGuards(session)
    list(@Req() q: Request, @Res() s: ServerResponse, @Param('consultationId') id: string) { return invoke(q, s, () => store.authorRead(q.principal!, id, null, prescriptionQuery(q.url!))); }
    @Get('consultations/:consultationId/prescriptions/:prescriptionId') @UseGuards(session)
    detail(@Req() q: Request, @Res() s: ServerResponse, @Param('consultationId') id: string, @Param('prescriptionId') doc: string) { return invoke(q, s, () => store.authorRead(q.principal!, id, doc, prescriptionQuery(q.url!))); }
    @Post('consultations/:consultationId/prescriptions/:prescriptionId/:command') @UseGuards(session, csrf)
    command(@Req() q: Request, @Res() s: ServerResponse, @Param('consultationId') id: string, @Param('prescriptionId') doc: string, @Param('command') command: string) { return invoke(q, s, () => store.execute(commands[command], q.principal!, { ...q.body as object, consultationId: id, prescriptionId: doc })); }
    @Get('me/prescriptions') @UseGuards(session)
    own(@Req() q: Request, @Res() s: ServerResponse) { return invoke(q, s, () => store.signedRead(q.principal!, null, null, prescriptionQuery(q.url!))); }
    @Get('me/prescriptions/:prescriptionId') @UseGuards(session)
    ownDetail(@Req() q: Request, @Res() s: ServerResponse, @Param('prescriptionId') id: string) { return invoke(q, s, () => store.signedRead(q.principal!, null, id, prescriptionQuery(q.url!))); }
    @Get('patients/:patientId/prescriptions') @UseGuards(session)
    related(@Req() q: Request, @Res() s: ServerResponse, @Param('patientId') patient: string) { return invoke(q, s, () => store.signedRead(q.principal!, patient, null, prescriptionQuery(q.url!))); }
    @Get('patients/:patientId/prescriptions/:prescriptionId') @UseGuards(session)
    relatedDetail(@Req() q: Request, @Res() s: ServerResponse, @Param('patientId') patient: string, @Param('prescriptionId') id: string) { return invoke(q, s, () => store.signedRead(q.principal!, patient, id, prescriptionQuery(q.url!))); }
  }
  return PrescriptionController;
}
