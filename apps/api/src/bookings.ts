import { Controller, Get, Post, Put, Req, Res, Param, UseGuards, HttpException } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { BookingError, bookingInput, availabilityExact, availabilityId, type BookingPersistence, type AuthPrincipal } from '@egyhealth/db';
import { authError, verifyOrigin, requireJson, SessionAuthGuard, SessionAuthenticator, CsrfGuard, sessionCookie, type AuthRuntime } from './auth.js';
import { parseAvailabilityQuery } from './availability.js';
type Request = IncomingMessage & {
    body?: unknown;
    principal?: AuthPrincipal;
};
type Command = 'CREATE' | 'CANCEL' | 'RESCHEDULE' | 'ATTEND' | 'CORRECT';
const invalid = () => authError(400, 'REQUEST_INVALID', 'Invalid request.');
function failure(e: unknown) { if (e instanceof HttpException)
    return e; if (e instanceof BookingError) {
    if (e.code === 'BOOKING_INVALID')
        return invalid();
    if (e.code === 'BOOKING_UNAUTHENTICATED')
        return authError(401, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
    if (e.code === 'BOOKING_NOT_FOUND')
        return authError(404, 'BOOKING_NOT_FOUND', 'Not found.');
    if (e.code === 'BOOKING_CONFLICT')
        return authError(409, 'BOOKING_CONFLICT', 'Conflicting booking operation.');
} return authError(503, 'BOOKING_UNAVAILABLE', 'Service unavailable.'); }
function send(q: Request, s: ServerResponse, status: number, value: unknown) { s.statusCode = status; s.setHeader('Cache-Control', 'no-store'); s.setHeader('Content-Type', 'application/json'); s.end(q.method === 'HEAD' ? undefined : JSON.stringify(value)); }
export function parseBookingJson(raw: string, command: Command) {
    try {
        const v: unknown = JSON.parse(raw), seen = new Set();
        for (const token of raw.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
            if (!/^[ \t\r\n]*:/.test(raw.slice(token.index + token[0].length)))
                continue;
            const key = JSON.parse(token[0]);
            if (seen.has(key))
                throw invalid();
            seen.add(key);
        }
        const fields = command === 'CREATE' ? ['slotId', 'operationKey'] : command === 'RESCHEDULE' ? ['slotId', 'operationKey', 'expectedVersion'] : command === 'ATTEND' ? ['observation', 'operationKey', 'expectedVersion'] : command === 'CORRECT' ? ['observation', 'reason', 'operationKey', 'expectedVersion'] : ['operationKey', 'expectedVersion'];
        availabilityExact(v, fields);
        bookingInput(command, command === 'CREATE' ? v : { ...v, bookingId: '00000000-0000-4000-8000-000000000001' });
        return v;
    }
    catch {
        throw invalid();
    }
}
export function bookingRequestBoundary(auth: AuthRuntime) {
    return (q: Request, s: ServerResponse, next: (e?: unknown) => void) => {
        const raw = q.url ?? '', path = raw.split('?')[0];
        let decoded = path;
        try {
            decoded = decodeURIComponent(path);
        }
        catch { /* raw invalid paths cannot be aliases */ }
        const normalized = decoded.toLowerCase().replace(/\/+$/, '');
        if (!/^\/api\/v1\/me\/(bookings|schedule)(?:\/|$)/.test(normalized))
            return next();
        s.setHeader('Cache-Control', 'no-store');
        const reject = (e: unknown) => { const x = failure(e); send(q, s, x.getStatus(), x.getResponse()); };
        const collection = path === '/api/v1/me/bookings', schedule = path === '/api/v1/me/schedule', detail = /^\/api\/v1\/me\/bookings\/[^/]+$/.test(path), match = /^\/api\/v1\/me\/bookings\/[^/]+\/(cancel|reschedule|attendance|attendance\/correct)$/.exec(path);
        let command: Command = 'CREATE';
        try {
            if (Buffer.byteLength(raw) > 2048 || q.rawHeaders.reduce((n, v) => n + Buffer.byteLength(v), 0) > 8192)
                throw invalid();
            if (path !== normalized || path.includes('%') || (!collection && !schedule && !detail && !match))
                throw authError(404, 'BOOKING_NOT_FOUND', 'Not found.');
            const methods = collection ? ['GET', 'HEAD', 'POST'] : match ? ['PUT'] : ['GET', 'HEAD'];
            if (!methods.includes(q.method ?? '')) {
                s.setHeader('Allow', methods.join(', '));
                throw authError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
            }
            if (q.method === 'GET' || q.method === 'HEAD') {
                if (q.headers['transfer-encoding'] !== undefined || Number(q.headers['content-length'] ?? 0) > 0 || detail && raw.includes('?'))
                    throw invalid();
                parseAvailabilityQuery(raw, false);
                return next();
            }
            if (raw.includes('?'))
                throw invalid();
            verifyOrigin(q, auth.config);
            requireJson(q);
            const count = (name: string) => q.rawHeaders.filter((v, i) => i % 2 === 0 && v.toLowerCase() === name).length;
            if (count('idempotency-key'))
                throw invalid();
            if (count('content-encoding') > 1 || q.headers['content-encoding'] !== undefined && q.headers['content-encoding'] !== 'identity')
                throw authError(415, 'REQUEST_CONTENT_TYPE_INVALID', 'Unsupported content type.');
            command = collection ? 'CREATE' : match![1] === 'cancel' ? 'CANCEL' : match![1] === 'reschedule' ? 'RESCHEDULE' : match![1] === 'attendance' ? 'ATTEND' : 'CORRECT';
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
        } q.body = parseBookingJson(text, command); next(); })().catch(reject);
    };
}
export function bookingController(auth: AuthRuntime, store: BookingPersistence) {
    const session = new SessionAuthGuard(new SessionAuthenticator(auth)), csrf = new CsrfGuard(auth.config);
    const target = (value: string) => { try {
        return availabilityId(value);
    }
    catch {
        throw authError(404, 'BOOKING_NOT_FOUND', 'Not found.');
    } };
    async function invoke(q: Request, s: ServerResponse, op: () => Promise<unknown>) { try {
        send(q, s, 200, await op());
    }
    catch (e) {
        if (e instanceof BookingError && e.code === 'BOOKING_UNAUTHENTICATED')
            s.setHeader('Set-Cookie', sessionCookie(auth.config, null));
        throw failure(e);
    } }
    const mutate = (q: Request, s: ServerResponse, id: string, method: 'cancel' | 'reschedule' | 'attend' | 'correct') => invoke(q, s, async () => ({ data: await store[method](q.principal!, { ...q.body as Record<string, unknown>, bookingId: target(id) }) }));
    @Controller()
    class BookingController {
        @Get('me/bookings')
        @UseGuards(session)
        history(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse) { return invoke(q, s, () => store.history(q.principal!, parseAvailabilityQuery(q.url!, false))); }
        @Get('me/schedule')
        @UseGuards(session)
        schedule(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse) { return invoke(q, s, () => store.schedule(q.principal!, parseAvailabilityQuery(q.url!, false))); }
        @Get('me/bookings/:bookingId')
        @UseGuards(session)
        detail(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse,
        @Param('bookingId')
        id: string) { return invoke(q, s, () => store.detail(q.principal!, target(id))); }
        @Post('me/bookings')
        @UseGuards(session, csrf)
        create(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse) { return invoke(q, s, async () => ({ data: await store.create(q.principal!, q.body) })); }
        @Put('me/bookings/:bookingId/cancel')
        @UseGuards(session, csrf)
        cancel(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse,
        @Param('bookingId')
        id: string) { return mutate(q, s, id, 'cancel'); }
        @Put('me/bookings/:bookingId/reschedule')
        @UseGuards(session, csrf)
        reschedule(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse,
        @Param('bookingId')
        id: string) { return mutate(q, s, id, 'reschedule'); }
        @Put('me/bookings/:bookingId/attendance')
        @UseGuards(session, csrf)
        attend(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse,
        @Param('bookingId')
        id: string) { return mutate(q, s, id, 'attend'); }
        @Put('me/bookings/:bookingId/attendance/correct')
        @UseGuards(session, csrf)
        correct(
        @Req()
        q: Request,
        @Res()
        s: ServerResponse,
        @Param('bookingId')
        id: string) { return mutate(q, s, id, 'correct'); }
    }
    return BookingController;
}
