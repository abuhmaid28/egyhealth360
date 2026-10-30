import { Controller, Get, Post, Req, Res, Param, UseGuards, HttpException } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DocumentationError, documentationJson, availabilityId, type DocumentCommand, type DocumentationPersistence, type AuthPrincipal } from '@egyhealth/db';
import { authError, verifyOrigin, requireJson, SessionAuthGuard, SessionAuthenticator, CsrfGuard, sessionCookie, type AuthRuntime } from './auth.js';
type Request = IncomingMessage & { body?: unknown; principal?: AuthPrincipal };
const invalid = () => authError(400, 'REQUEST_INVALID', 'Invalid request.');
const missing = () => authError(404, 'DOCUMENT_NOT_FOUND', 'Not found.');
function failure(e: unknown) {
  if (e instanceof HttpException) return e;
  if (e instanceof DocumentationError) {
    if (e.code === 'DOCUMENT_INVALID') return invalid();
    if (e.code === 'DOCUMENT_UNAUTHENTICATED') return authError(401, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
    if (e.code === 'DOCUMENT_NOT_FOUND') return missing();
    if (e.code === 'DOCUMENT_CONFLICT') return authError(409, 'DOCUMENT_CONFLICT', 'Conflicting document operation.');
  }
  return authError(503, 'DOCUMENT_UNAVAILABLE', 'Service unavailable.');
}
function send(q: Request, s: ServerResponse, status: number, value: unknown) { s.statusCode = status; s.setHeader('Cache-Control', 'no-store'); s.setHeader('Content-Type', 'application/json'); s.end(q.method === 'HEAD' ? undefined : JSON.stringify(value)); }
export function documentQuery(raw: string, list: boolean) {
  const q = new URL(raw, 'http://localhost').searchParams, out: Record<string, number> = {};
  for (const [k, v] of q) { if (!list || !['page', 'pageSize'].includes(k) || Object.hasOwn(out, k) || !/^[1-9][0-9]*$/.test(v) || Number(v) > (k === 'page' ? 10000 : 100)) throw invalid(); out[k] = Number(v); }
  if (!list && raw.includes('?')) throw invalid();
  return out;
}
const commands: Record<string, DocumentCommand> = { sign: 'SIGN', 'sign-release': 'RELEASE', addenda: 'ADDENDUM', corrections: 'CORRECT', 'privacy-restrictions': 'PRIVACY' };
export function documentationRequestBoundary(auth: AuthRuntime) {
  return (q: Request, s: ServerResponse, next: (e?: unknown) => void) => {
    const raw = q.url ?? '', path = raw.split('?')[0]; let decoded = path; try { decoded = decodeURIComponent(path); } catch { /* no aliases */ }
    const normalized = decoded.toLowerCase().replace(/\/+$/, '');
    if (!/^\/api\/v1\/(?:consultations(?:\/|$)|me\/summaries(?:\/|$)|patients\/[^/]+\/summaries(?:\/|$))/.test(normalized)) return next();
    if (/^\/api\/v1\/consultations\/[^/]+\/follow-up-intents(?:\/|$)/.test(normalized)) return next();
    s.setHeader('Cache-Control', 'no-store');
    const reject = (e: unknown) => { const x = failure(e); send(q, s, x.getStatus(), x.getResponse()); };
    let command: DocumentCommand = 'DRAFT';
    try {
      if (Buffer.byteLength(raw) > 2048 || q.rawHeaders.reduce((n, v) => n + Buffer.byteLength(v), 0) > 8192) throw invalid();
      const author = /^\/api\/v1\/consultations\/([^/]+)\/documents(?:\/([^/]+)(?:\/(sign|sign-release|addenda|corrections|privacy-restrictions))?)?$/.exec(path);
      const released = /^\/api\/v1\/(?:me\/summaries|patients\/([^/]+)\/summaries)(?:\/([^/]+))?$/.exec(path);
      if (path !== normalized || path.includes('%') || !author && !released) throw missing();
      for (const id of author ? [author[1], author[2]] : [released![1], released![2]]) if (id !== undefined) { try { availabilityId(id); } catch { throw missing(); } }
      const list = author ? !author[2] : !released![2];
      const methods = author?.[3] ? ['POST'] : author && list ? ['GET', 'HEAD', 'POST'] : ['GET', 'HEAD'];
      if (!methods.includes(q.method ?? '')) { s.setHeader('Allow', methods.join(', ')); throw authError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.'); }
      if (q.method === 'GET' || q.method === 'HEAD') {
        if (q.headers['transfer-encoding'] !== undefined || Number(q.headers['content-length'] ?? 0) > 0) throw invalid();
        documentQuery(raw, true); return next();
      }
      if (raw.includes('?')) throw invalid();
      verifyOrigin(q, auth.config); requireJson(q);
      const count = (name: string) => q.rawHeaders.filter((v, i) => i % 2 === 0 && v.toLowerCase() === name).length;
      if (count('idempotency-key')) throw invalid();
      if (count('content-encoding') > 1 || q.headers['content-encoding'] !== undefined && q.headers['content-encoding'] !== 'identity') throw authError(415, 'REQUEST_CONTENT_TYPE_INVALID', 'Unsupported content type.');
      command = author?.[3] ? commands[author[3]] : 'DRAFT';
    } catch (e) { q.resume(); return reject(e); }
    void (async () => {
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of q.iterator({ destroyOnReturn: false })) { size += chunk.length; if (size > 16384) { q.resume(); return reject(authError(413, 'REQUEST_TOO_LARGE', 'Request too large.')); } chunks.push(Buffer.from(chunk)); }
      let raw: string; try { raw = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)); } catch { throw invalid(); }
      q.body = documentationJson(raw, command); next();
    })().catch(reject);
  };
}
export function documentationController(auth: AuthRuntime, store: DocumentationPersistence) {
  const session = new SessionAuthGuard(new SessionAuthenticator(auth)), csrf = new CsrfGuard(auth.config);
  async function invoke(q: Request, s: ServerResponse, op: () => Promise<unknown>) { try { send(q, s, 200, await op()); } catch (e) { if (e instanceof DocumentationError && e.code === 'DOCUMENT_UNAUTHENTICATED') s.setHeader('Set-Cookie', sessionCookie(auth.config, null)); throw failure(e); } }
  @Controller()
  class DocumentationController {
    @Post('consultations/:consultationId/documents') @UseGuards(session, csrf)
    draft(@Req() q: Request, @Res() s: ServerResponse, @Param('consultationId') id: string) { return invoke(q, s, () => store.execute('DRAFT', q.principal!, { ...q.body as object, consultationId: id })); }
    @Get('consultations/:consultationId/documents') @UseGuards(session)
    list(@Req() q: Request, @Res() s: ServerResponse, @Param('consultationId') id: string) { return invoke(q, s, () => store.authorRead(q.principal!, id, null, documentQuery(q.url!, true))); }
    @Get('consultations/:consultationId/documents/:documentId') @UseGuards(session)
    detail(@Req() q: Request, @Res() s: ServerResponse, @Param('consultationId') id: string, @Param('documentId') doc: string) { return invoke(q, s, () => store.authorRead(q.principal!, id, doc, documentQuery(q.url!, true))); }
    @Post('consultations/:consultationId/documents/:documentId/:command') @UseGuards(session, csrf)
    command(@Req() q: Request, @Res() s: ServerResponse, @Param('consultationId') id: string, @Param('documentId') doc: string, @Param('command') command: string) { return invoke(q, s, () => store.execute(commands[command], q.principal!, { ...q.body as object, consultationId: id, documentId: doc })); }
    @Get('me/summaries') @UseGuards(session)
    own(@Req() q: Request, @Res() s: ServerResponse) { return invoke(q, s, () => store.releasedRead(q.principal!, null, null, documentQuery(q.url!, true))); }
    @Get('me/summaries/:summaryId') @UseGuards(session)
    ownDetail(@Req() q: Request, @Res() s: ServerResponse, @Param('summaryId') id: string) { return invoke(q, s, () => store.releasedRead(q.principal!, null, id, documentQuery(q.url!, true))); }
    @Get('patients/:patientId/summaries') @UseGuards(session)
    related(@Req() q: Request, @Res() s: ServerResponse, @Param('patientId') patient: string) { return invoke(q, s, () => store.releasedRead(q.principal!, patient, null, documentQuery(q.url!, true))); }
    @Get('patients/:patientId/summaries/:summaryId') @UseGuards(session)
    relatedDetail(@Req() q: Request, @Res() s: ServerResponse, @Param('patientId') patient: string, @Param('summaryId') id: string) { return invoke(q, s, () => store.releasedRead(q.principal!, patient, id, documentQuery(q.url!, true))); }
  }
  return DocumentationController;
}
