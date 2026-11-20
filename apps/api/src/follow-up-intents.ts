import { Controller, Get, Post, Req, Res, Param, UseGuards, HttpException } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { FollowUpIntentError, intentJson, availabilityId, type IntentCommand, type FollowUpIntentPersistence, type AuthPrincipal } from '@egyhealth/db';
import { authError, verifyOrigin, requireJson, SessionAuthGuard, SessionAuthenticator, CsrfGuard, sessionCookie, type AuthRuntime } from './auth.js';
type Request = IncomingMessage & { body?: unknown; principal?: AuthPrincipal };
const invalid = () => authError(400, 'REQUEST_INVALID', 'Invalid request.');
const missing = () => authError(404, 'FOLLOW_UP_INTENT_NOT_FOUND', 'Not found.');
function failure(e: unknown) {
  if (e instanceof HttpException) return e;
  if (e instanceof FollowUpIntentError) {
    if (e.code === 'FOLLOW_UP_INTENT_INVALID') return invalid();
    if (e.code === 'FOLLOW_UP_INTENT_UNAUTHENTICATED') return authError(401, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
    if (e.code === 'FOLLOW_UP_INTENT_NOT_FOUND') return missing();
    if (e.code === 'FOLLOW_UP_INTENT_CONFLICT') return authError(409, 'FOLLOW_UP_INTENT_CONFLICT', 'Conflicting follow-up intent operation.');
  }
  return authError(503, 'FOLLOW_UP_INTENT_UNAVAILABLE', 'Service unavailable.');
}
function send(q: Request, s: ServerResponse, status: number, value: unknown) { s.statusCode = status; s.setHeader('Cache-Control', 'no-store'); s.setHeader('Content-Type', 'application/json'); s.end(q.method === 'HEAD' ? undefined : JSON.stringify(value)); }
export function intentQuery(raw: string, list: boolean) {
  const query = raw.split('?')[1], out: Record<string,number> = {};
  if (query === undefined) return out;
  if (!query) throw invalid();
  for (const pair of query.split('&')) {
    const m = /^(page|pageSize|linkPage|linkPageSize)=([1-9][0-9]*)$/.exec(pair);
    if (!m || list && m[1].startsWith('link') || Object.hasOwn(out,m[1]) || Number(m[2]) > (m[1].endsWith('Size') ? 100 : 10000)) throw invalid();
    out[m[1]]=Number(m[2]);
  }
  return out;
}
const commands: Record<string,IntentCommand> = {'sign-release':'RELEASE',corrections:'CORRECT','booking-links':'LINK','booking-links/replacements':'REPLACE','privacy-restrictions':'PRIVACY'};
export function followUpIntentRequestBoundary(auth: AuthRuntime) {
  return (q: Request, s: ServerResponse, next: (e?: unknown) => void) => {
    const raw = q.url ?? '', path = raw.split('?')[0]; let decoded = path; try { decoded = decodeURIComponent(path); } catch { /* no aliases */ }
    const normalized = decoded.toLowerCase().replace(/\/+$/, '');
    if (!/^\/api\/v1\/(?:consultations\/[^/]+\/follow-up-intents|me\/follow-up-intents|patients\/[^/]+\/follow-up-intents)(?:\/|$)/.test(normalized)) return next();
    s.setHeader('Cache-Control', 'no-store');
    const reject = (e: unknown) => { const x = failure(e); send(q, s, x.getStatus(), x.getResponse()); };
    let command: IntentCommand = 'DRAFT';
    try {
      if (Buffer.byteLength(raw) > 2048 || q.rawHeaders.reduce((n, v) => n + Buffer.byteLength(v), 0) > 8192) throw invalid();
      const author = /^\/api\/v1\/consultations\/([^/]+)\/follow-up-intents(?:\/([^/]+)(?:\/(sign-release|corrections|booking-links(?:\/replacements)?|privacy-restrictions))?)?$/.exec(path);
      const released = /^\/api\/v1\/(?:me\/follow-up-intents|patients\/([^/]+)\/follow-up-intents)(?:\/([^/]+))?$/.exec(path);
      if (path !== normalized || path.includes('%') || !author && !released) throw missing();
      for (const id of author ? [author[1], author[2]] : [released![1], released![2]]) if (id !== undefined) { try { availabilityId(id); } catch { throw missing(); } }
      const list = author ? !author[2] : !released![2];
      const methods = author?.[3] ? ['POST'] : author && list ? ['GET', 'HEAD', 'POST'] : ['GET', 'HEAD'];
      if (!methods.includes(q.method ?? '')) { s.setHeader('Allow', methods.join(', ')); throw authError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.'); }
      if (q.method === 'GET' || q.method === 'HEAD') {
        if (q.headers['transfer-encoding'] !== undefined || Number(q.headers['content-length'] ?? 0) > 0) throw invalid();
        intentQuery(raw, list); return next();
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
      q.body = intentJson(raw, command); next();
    })().catch(reject);
  };
}
export function followUpIntentController(auth: AuthRuntime, store: FollowUpIntentPersistence) {
  const session = new SessionAuthGuard(new SessionAuthenticator(auth)), csrf = new CsrfGuard(auth.config);
  async function invoke(q: Request, s: ServerResponse, op: () => Promise<unknown>) { try { const result=await op() as {status?:number}; const {status=200,...body}=result; send(q,s,status,body); } catch (e) { if (e instanceof FollowUpIntentError && e.code === 'FOLLOW_UP_INTENT_UNAUTHENTICATED') s.setHeader('Set-Cookie', sessionCookie(auth.config, null)); throw failure(e); } }
  @Controller()
  class FollowUpIntentController {
    @Post('consultations/:consultationId/follow-up-intents') @UseGuards(session, csrf)
    draft(@Req() q: Request, @Res() s: ServerResponse, @Param('consultationId') id: string) { return invoke(q, s, () => store.execute('DRAFT', q.principal!, { ...q.body as object, consultationId: id })); }
    @Get('consultations/:consultationId/follow-up-intents') @UseGuards(session)
    list(@Req() q: Request, @Res() s: ServerResponse, @Param('consultationId') id: string) { return invoke(q, s, () => store.authorRead(q.principal!, id, null, intentQuery(q.url!, true))); }
    @Get('consultations/:consultationId/follow-up-intents/:intentId') @UseGuards(session)
    detail(@Req() q: Request, @Res() s: ServerResponse, @Param('consultationId') id: string, @Param('intentId') doc: string) { return invoke(q, s, () => store.authorRead(q.principal!, id, doc, intentQuery(q.url!, false))); }
    @Post('consultations/:consultationId/follow-up-intents/:intentId/:command') @UseGuards(session, csrf)
    command(@Req() q: Request, @Res() s: ServerResponse, @Param('consultationId') id: string, @Param('intentId') doc: string, @Param('command') command: string) { return invoke(q, s, () => store.execute(commands[command], q.principal!, { ...q.body as object, consultationId: id, intentId: doc })); }
    @Post('consultations/:consultationId/follow-up-intents/:intentId/booking-links/replacements') @UseGuards(session,csrf)
    replace(@Req() q:Request,@Res() s:ServerResponse,@Param('consultationId') id:string,@Param('intentId') intent:string) { return invoke(q,s,()=>store.execute('REPLACE',q.principal!,{...q.body as object,consultationId:id,intentId:intent})); }
    @Get('me/follow-up-intents') @UseGuards(session)
    own(@Req() q: Request, @Res() s: ServerResponse) { return invoke(q, s, () => store.releasedRead(q.principal!, null, null, intentQuery(q.url!, true))); }
    @Get('me/follow-up-intents/:intentId') @UseGuards(session)
    ownDetail(@Req() q: Request, @Res() s: ServerResponse, @Param('intentId') id: string) { return invoke(q, s, () => store.releasedRead(q.principal!, null, id, intentQuery(q.url!, false))); }
    @Get('patients/:patientId/follow-up-intents') @UseGuards(session)
    related(@Req() q: Request, @Res() s: ServerResponse, @Param('patientId') patient: string) { return invoke(q, s, () => store.releasedRead(q.principal!, patient, null, intentQuery(q.url!, true))); }
    @Get('patients/:patientId/follow-up-intents/:intentId') @UseGuards(session)
    relatedDetail(@Req() q: Request, @Res() s: ServerResponse, @Param('patientId') patient: string, @Param('intentId') id: string) { return invoke(q, s, () => store.releasedRead(q.principal!, patient, id, intentQuery(q.url!, false))); }
  }
  return FollowUpIntentController;
}
