import { Controller, Get, Post, Put, Req, Res, Param, UseGuards, HttpException } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AvailabilityError, availabilityPage, availabilityExact, availabilityId, availabilityInteger, availabilityTime, type AvailabilityPersistence, type AuthPrincipal } from '@egyhealth/db';
import { authError, verifyOrigin, requireJson, SessionAuthGuard, SessionAuthenticator, CsrfGuard, sessionCookie, type AuthRuntime } from './auth.js';
type Request = IncomingMessage & {
    body?: unknown;
    principal?: AuthPrincipal;
};
const invalid = () => authError(400, 'REQUEST_INVALID', 'Invalid request.');
function failure(e: unknown, isPublic = false) { if (e instanceof HttpException)
    return e; if (e instanceof AvailabilityError) {
    if (e.code === 'AVAILABILITY_INVALID')
        return invalid();
    if (e.code === 'AVAILABILITY_UNAUTHENTICATED')
        return authError(401, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
    if (e.code === 'AVAILABILITY_NOT_FOUND')
        return authError(404, isPublic ? 'DIRECTORY_NOT_FOUND' : 'AVAILABILITY_NOT_FOUND', 'Not found.');
    if (e.code === 'AVAILABILITY_CONFLICT')
        return authError(409, 'AVAILABILITY_CONFLICT', 'Conflicting availability operation.');
} return authError(503, 'AVAILABILITY_UNAVAILABLE', 'Service unavailable.'); }
function send(q: Request, s: ServerResponse, status: number, value: unknown) { s.statusCode = status; s.setHeader('Cache-Control', 'no-store'); s.setHeader('Content-Type', 'application/json'); s.end(q.method === 'HEAD' ? undefined : JSON.stringify(value)); }
export function parseAvailabilityJson(raw: string, publish: boolean) {
    let v: unknown;
    try {
        v = JSON.parse(raw);
    }
    catch {
        throw invalid();
    }
    const seen = new Set<string>();
    for (const token of raw.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
        if (!/^[ \t\r\n]*:/.test(raw.slice(token.index + token[0].length)))
            continue;
        const key: string = JSON.parse(token[0]);
        if (seen.has(key))
            throw invalid();
        seen.add(key);
    }
    try {
        availabilityExact(v, publish ? ['clinicId', 'startAt', 'endAt', 'operationKey'] : ['operationKey', 'expectedVersion']);
        if (publish) {
            availabilityId(v.clinicId);
            availabilityTime(v.startAt);
            availabilityTime(v.endAt);
        }
        else
            availabilityInteger(v.expectedVersion, 1, 2147483646);
        availabilityId(v.operationKey);
        return v;
    }
    catch {
        throw invalid();
    }
}
export function parseAvailabilityQuery(raw: string, isPublic: boolean) { const out: Record<string, string> = {}; if (raw.includes('?')) {
    const query = raw.slice(raw.indexOf('?') + 1);
    if (!query)
        throw invalid();
    for (const part of query.split('&')) {
        const m = /^(page|pageSize|clinic|from|to)=([^&=]+)$/.exec(part);
        if (!m || Object.hasOwn(out, m[1]))
            throw invalid();
        let value: string;
        try {
            value = decodeURIComponent(m[2]);
        }
        catch {
            throw invalid();
        }
        if (encodeURIComponent(value) !== m[2] && value !== m[2])
            throw invalid();
        out[m[1]] = value;
    }
} try {
    availabilityPage(out, isPublic);
}
catch {
    throw invalid();
} return out; }
export function availabilityRequestBoundary(auth: AuthRuntime) {
    return (q: Request, s: ServerResponse, next: (e?: unknown) => void) => {
        const raw = q.url ?? '', path = raw.split('?')[0], normalized = path.toLowerCase().replace(/\/+$/, '');
        const isPublic = /^\/api\/v1\/directory\/providers\/[^/]+\/availability(?:\/|$)/.test(normalized), own = /^\/api\/v1\/me\/availability(?:\/|$)/.test(normalized);
        if (!isPublic && !own)
            return next();
        s.setHeader('Cache-Control', 'no-store');
        const reject = (e: unknown) => { const x = failure(e, isPublic); send(q, s, x.getStatus(), x.getResponse()); };
        try {
            if (Buffer.byteLength(raw) > 2048 || q.rawHeaders.reduce((n, v) => n + Buffer.byteLength(v), 0) > 8192)
                throw invalid();
            if (path !== normalized || path.includes('%'))
                throw authError(404, isPublic ? 'DIRECTORY_NOT_FOUND' : 'AVAILABILITY_NOT_FOUND', 'Not found.');
            const collection = path === '/api/v1/me/availability', command = /^\/api\/v1\/me\/availability\/[^/]+\/withdraw$/.test(path);
            if (!isPublic && !collection && !command)
                throw authError(404, 'AVAILABILITY_NOT_FOUND', 'Not found.');
            const methods = isPublic ? ['GET', 'HEAD'] : command ? ['PUT'] : ['GET', 'HEAD', 'POST'];
            if (!methods.includes(q.method ?? '')) {
                s.setHeader('Allow', methods.join(', '));
                throw authError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
            }
            if (q.method === 'GET' || q.method === 'HEAD') {
                if (q.headers['transfer-encoding'] !== undefined || Number(q.headers['content-length'] ?? 0) > 0)
                    throw invalid();
                parseAvailabilityQuery(raw, isPublic);
                return next();
            }
            if (raw.includes('?'))
                throw invalid();
            verifyOrigin(q, auth.config);
            requireJson(q);
            const count = (name: string) => q.rawHeaders.filter((v, i) => i % 2 === 0 && v.toLowerCase() === name).length;
            if (count('idempotency-key'))
                throw invalid();
            if (count('content-encoding') > 1 || (q.headers['content-encoding'] !== undefined && q.headers['content-encoding'] !== 'identity'))
                throw authError(415, 'REQUEST_CONTENT_TYPE_INVALID', 'Unsupported content type.');
        }
        catch (e) {
            q.resume();
            return reject(e);
        }
        void (async () => { const chunks: Buffer[] = []; let size = 0; for await (const chunk of q.iterator({ destroyOnReturn: false })) {
            size += chunk.length;
            if (size > 16384) {
                q.resume();
                return reject(authError(413, 'REQUEST_TOO_LARGE', 'Request too large.'));
            }
            chunks.push(Buffer.from(chunk));
        } let text: string; try {
            text = new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks));
        }
        catch {
            throw invalid();
        } q.body = parseAvailabilityJson(text, q.method === 'POST'); next(); })().catch(reject);
    };
}
export function availabilityController(auth: AuthRuntime, store: AvailabilityPersistence) {
    const session = new SessionAuthGuard(new SessionAuthenticator(auth)), csrf = new CsrfGuard(auth.config);
    async function invoke(q: Request, s: ServerResponse, op: () => Promise<unknown>, isPublic = false) { try {
        send(q, s, 200, await op());
    }
    catch (e) {
        if (e instanceof AvailabilityError && e.code === 'AVAILABILITY_UNAUTHENTICATED')
            s.setHeader('Set-Cookie', sessionCookie(auth.config, null));
        throw failure(e, isPublic);
    } }
    const target = (v: string, publicRoute = false) => { try {
        return availabilityId(v);
    }
    catch {
        throw authError(404, publicRoute ? 'DIRECTORY_NOT_FOUND' : 'AVAILABILITY_NOT_FOUND', 'Not found.');
    } };
    @Controller()
    class AvailabilityController {
        @Get('directory/providers/:publicId/availability')
        public(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse,
        @Param('publicId')
        v: string) { return invoke(q, s, () => store.publicAvailability(target(v, true), parseAvailabilityQuery(q.url!, true)), true); }
        @Get('me/availability')
        @UseGuards(session)
        history(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse) { return invoke(q, s, () => store.history(q.principal!, parseAvailabilityQuery(q.url!, false))); }
        @Post('me/availability')
        @UseGuards(session, csrf)
        publish(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse) { return invoke(q, s, async () => ({ data: await store.publish(q.principal!, q.body as {
                clinicId: string;
                startAt: string;
                endAt: string;
                operationKey: string;
            }) })); }
        @Put('me/availability/:slotId/withdraw')
        @UseGuards(session, csrf)
        withdraw(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse,
        @Param('slotId')
        v: string) { return invoke(q, s, async () => ({ data: await store.withdraw(q.principal!, { ...q.body as {
                    operationKey: string;
                    expectedVersion: number;
                }, slotId: target(v) }) })); }
    }
    return AvailabilityController;
}
