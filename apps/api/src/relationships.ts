import { Controller, Get, Post, Put, Req, Res, Param, UseGuards, HttpException } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { RelationshipError, relationshipInput, relationshipAuthorization, relationshipId, relationshipPage, type RelationshipPersistence, type AuthPrincipal } from '@egyhealth/db';
import { authError, verifyOrigin, requireJson, SessionAuthGuard, SessionAuthenticator, CsrfGuard, sessionCookie, type AuthRuntime } from './auth.js';
type Request = IncomingMessage & {
    body?: unknown;
    principal?: AuthPrincipal;
};
const invalid = () => authError(400, 'REQUEST_INVALID', 'Invalid request.');
function failure(e: unknown) {
    if (e instanceof HttpException)
        return e;
    if (e instanceof RelationshipError) {
        if (e.code === 'RELATIONSHIP_INVALID')
            return invalid();
        if (e.code === 'RELATIONSHIP_UNAUTHENTICATED')
            return authError(401, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
        if (e.code === 'RELATIONSHIP_NOT_FOUND')
            return authError(404, 'RELATIONSHIP_NOT_FOUND', 'Not found.');
        if (e.code === 'RELATIONSHIP_CONFLICT')
            return authError(409, 'RELATIONSHIP_CONFLICT', 'Conflicting relationship operation.');
    }
    return authError(503, 'RELATIONSHIP_UNAVAILABLE', 'Service unavailable.');
}
function send(req: Request, res: ServerResponse, status: number, data: unknown) { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(req.method === 'HEAD' ? undefined : JSON.stringify(data)); }
export function parseRelationshipJson(raw: string, create: boolean) {
    let value: unknown;
    try {
        value = JSON.parse(raw);
    }
    catch {
        throw invalid();
    }
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.values(value).some(v => typeof v !== 'string'))
        throw invalid();
    const seen = new Set<string>();
    for (const token of raw.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
        if (!/^[ \t\r\n]*:/.test(raw.slice(token.index + token[0].length)))
            continue;
        const k: string = JSON.parse(token[0]);
        if (seen.has(k))
            throw invalid();
        seen.add(k);
    }
    try {
        if (!create)
            return relationshipInput(value, []);
        const v = relationshipAuthorization(value);
        return v.providerId ? { providerId: v.providerId, operationKey: v.operationKey } : { assignmentId: v.assignmentId!, operationKey: v.operationKey };
    }
    catch (e) {
        throw failure(e);
    }
}
export function relationshipRequestBoundary(auth: AuthRuntime) {
    return (req: Request, res: ServerResponse, next: (e?: unknown) => void) => {
        const raw = req.url ?? '', path = raw.split('?')[0], normalized = path.toLowerCase().replace(/\/+$/, '');
        if (!/^\/api\/v1\/me\/(relationship-requests|relationships)(\/|$)/.test(normalized))
            return next();
        res.setHeader('Cache-Control', 'no-store');
        const reject = (e: unknown) => { const x = failure(e); send(req, res, x.getStatus(), x.getResponse()); };
        try {
            if (raw.length > 2048 || req.rawHeaders.reduce((n, v) => n + Buffer.byteLength(v), 0) > 8192)
                throw invalid();
            // Canonical paths only; Express case/trailing/encoded aliases cannot choose a target.
            if (path !== normalized || path.includes('%'))
                throw authError(404, 'RELATIONSHIP_NOT_FOUND', 'Not found.');
            const collection = /^\/api\/v1\/me\/(relationship-requests|relationships)$/.test(path), command = /\/(accept|decline|withdraw|end)$/.test(path);
            const methods = command ? ['PUT'] : collection && path.endsWith('relationship-requests') ? ['GET', 'HEAD', 'POST'] : ['GET', 'HEAD'];
            if (!methods.includes(req.method ?? '')) {
                res.setHeader('Allow', methods.join(', '));
                throw authError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
            }
            if (req.method === 'GET' || req.method === 'HEAD') {
                if (req.headers['transfer-encoding'] !== undefined || Number(req.headers['content-length'] ?? 0) > 0)
                    throw invalid();
                if (raw.includes('?') && !/\?(?:page|pageSize)=[1-9][0-9]{0,4}(?:&(?:page|pageSize)=[1-9][0-9]{0,4})?$/.test(raw))
                    throw invalid();
                const url = new URL(raw, 'http://localhost');
                const query: Record<string, string> = {};
                for (const [k, v] of url.searchParams) {
                    if (!collection || Object.hasOwn(query, k))
                        throw invalid();
                    query[k] = v;
                }
                relationshipPage(query);
                return next();
            }
            if (raw.includes('?'))
                throw invalid();
            verifyOrigin(req, auth.config);
            requireJson(req);
            const count = (name: string) => req.rawHeaders.filter((v, i) => i % 2 === 0 && v.toLowerCase() === name).length;
            if (count('content-encoding') > 1 || (req.headers['content-encoding'] !== undefined && req.headers['content-encoding'] !== 'identity'))
                throw authError(415, 'REQUEST_CONTENT_TYPE_INVALID', 'Unsupported content type.');
            if (count('idempotency-key'))
                throw invalid();
        }
        catch (e) {
            req.resume();
            return reject(e);
        }
        void (async () => {
            const chunks: Buffer[] = [];
            let size = 0;
            for await (const chunk of req.iterator({ destroyOnReturn: false })) {
                size += chunk.length;
                if (size > 16384) {
                    req.resume();
                    return reject(authError(413, 'REQUEST_TOO_LARGE', 'Request too large.'));
                }
                chunks.push(Buffer.from(chunk));
            }
            let rawBody: string;
            try {
                rawBody = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
            }
            catch {
                throw invalid();
            }
            req.body = parseRelationshipJson(rawBody, req.method === 'POST');
            next();
        })().catch(reject);
    };
}
export function relationshipController(auth: AuthRuntime, store: RelationshipPersistence) {
    const session = new SessionAuthGuard(new SessionAuthenticator(auth)), csrf = new CsrfGuard(auth.config);
    async function invoke(req: Request, res: ServerResponse, op: () => Promise<unknown>) {
        try {
            send(req, res, 200, await op());
        }
        catch (e) {
            if (e instanceof RelationshipError && e.code === 'RELATIONSHIP_UNAUTHENTICATED')
                res.setHeader('Set-Cookie', sessionCookie(auth.config, null));
            throw failure(e);
        }
    }
    function target(v: string) {
        try {
            return relationshipId(v);
        }
        catch {
            throw authError(404, 'RELATIONSHIP_NOT_FOUND', 'Not found.');
        }
    }
    function page(req: Request) { return Object.fromEntries(new URL(req.url!, 'http://localhost').searchParams); }
    @Controller('me')
    class RelationshipController {
        @Get('relationship-requests')
        @UseGuards(session)
        requests(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse) { return invoke(q, s, () => store.read(q.principal!, 'requests', null, page(q))); }
        @Get('relationship-requests/:requestId')
        @UseGuards(session)
        request(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse,
        @Param('requestId')
        v: string) { return invoke(q, s, () => store.read(q.principal!, 'requests', target(v))); }
        @Post('relationship-requests')
        @UseGuards(session, csrf)
        authorize(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse) {
            return invoke(q, s, async () => ({ data: await store.authorize(q.principal!, q.body as {
                    providerId: string;
                    operationKey: string;
                }) }));
        }
        @Put('relationship-requests/:requestId/accept')
        @UseGuards(session, csrf)
        accept(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse,
        @Param('requestId')
        v: string) { return invoke(q, s, async () => ({ data: await store.decide(q.principal!, { requestId: target(v) }, 'accept') })); }
        @Put('relationship-requests/:requestId/decline')
        @UseGuards(session, csrf)
        decline(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse,
        @Param('requestId')
        v: string) { return invoke(q, s, async () => ({ data: await store.decide(q.principal!, { requestId: target(v) }, 'decline') })); }
        @Put('relationship-requests/:requestId/withdraw')
        @UseGuards(session, csrf)
        withdraw(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse,
        @Param('requestId')
        v: string) { return invoke(q, s, async () => ({ data: await store.decide(q.principal!, { requestId: target(v) }, 'withdraw') })); }
        @Get('relationships')
        @UseGuards(session)
        relationships(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse) { return invoke(q, s, () => store.read(q.principal!, 'relationships', null, page(q))); }
        @Get('relationships/:assignmentId')
        @UseGuards(session)
        relationship(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse,
        @Param('assignmentId')
        v: string) { return invoke(q, s, () => store.read(q.principal!, 'relationships', target(v))); }
        @Put('relationships/:assignmentId/end')
        @UseGuards(session, csrf)
        end(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse,
        @Param('assignmentId')
        v: string) { return invoke(q, s, async () => ({ data: await store.end(q.principal!, { assignmentId: target(v) }) })); }
    }
    return RelationshipController;
}
