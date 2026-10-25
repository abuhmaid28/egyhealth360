import { Controller, Get, Req, Res, HttpException } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { DirectoryError, directoryPage, providerPage, specialtyKey, directoryId, type PublicDirectory, type ProviderPage } from '@egyhealth/db';
import { authError } from './auth.js';
type Request = IncomingMessage & {
    params: Record<string, string | undefined>;
};
const invalid = () => authError(400, 'REQUEST_INVALID', 'Invalid request.');
function failure(error: unknown) {
    if (error instanceof DirectoryError) {
        if (error.code === 'DIRECTORY_INVALID')
            return invalid();
        if (error.code === 'DIRECTORY_NOT_FOUND')
            return authError(404, 'DIRECTORY_NOT_FOUND', 'Not found.');
    }
    return authError(503, 'DIRECTORY_UNAVAILABLE', 'Service unavailable.');
}
export function parseDirectoryQuery(url: string, providers: boolean) {
    const query = url.includes('?') ? url.slice(url.indexOf('?') + 1) : null;
    const values: Record<string, string> = {};
    if (query !== null) {
        if (!query || query.length > 2048)
            throw invalid();
        for (const part of query.split('&')) {
            const pair = /^(page|pageSize|specialty|clinic)=([a-zA-Z0-9-]+)$/.exec(part);
            if (!pair || Object.hasOwn(values, pair[1]) || (!providers && ['specialty', 'clinic'].includes(pair[1])))
                throw invalid();
            values[pair[1]] = pair[2];
        }
    }
    for (const name of ['page', 'pageSize'])
        if (values[name] && !/^[1-9][0-9]*$/.test(values[name]))
            throw invalid();
    try {
        const p = directoryPage({ page: values.page === undefined ? 1 : Number(values.page), pageSize: values.pageSize === undefined ? 20 : Number(values.pageSize) });
        return providers ? providerPage({ ...p, specialty: values.specialty === undefined ? null : specialtyKey(values.specialty), clinic: values.clinic === undefined ? null : directoryId(values.clinic, true) }) : p;
    }
    catch {
        throw invalid();
    }
}
/** Public reads never resolve cookies/roles or broaden their projection. Manual
 * responses deliberately bypass Express ETag/conditional-304 behavior. */
function respond(request: Request, response: ServerResponse, status: number, body: unknown) { response.statusCode = status; response.setHeader('Content-Type', 'application/json'); response.end(request.method === 'HEAD' ? undefined : JSON.stringify(body)); }
export function directoryRequestBoundary(request: Request, response: ServerResponse, next: (error?: unknown) => void) {
    const path = request.url?.split('?', 1)[0] ?? '';
    if (!/^\/api\/v1\/directory(?:\/|$)/i.test(path))
        return next();
    response.setHeader('Cache-Control', 'no-store');
    const deny = (status: number, code: string, message: string) => respond(request, response, status, { error: { code, message } });
    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
        request.resume();
        response.setHeader('Allow', 'GET, HEAD');
        return deny(405, 'METHOD_NOT_ALLOWED', 'Method not allowed.');
    }
    if ((request.url?.length ?? 0) > 2048 || request.rawHeaders.reduce((n, s) => n + Buffer.byteLength(s, 'utf8'), 0) > 8192 || request.headers['transfer-encoding'] !== undefined || Number(request.headers['content-length'] ?? 0) > 0) {
        request.resume();
        return deny(400, 'REQUEST_INVALID', 'Invalid request.');
    }
    // Invalid encoded provider locators must not reach Express's URI-error text.
    const parts = path.split('/');
    if (parts[5]?.includes('%')) {
        parts[5] = 'invalid-target';
        request.url = parts.join('/') + ((request.url ?? '').includes('?') ? (request.url ?? '').slice((request.url ?? '').indexOf('?')) : '');
    }
    next();
}
export function directoryController(store: PublicDirectory) {
    async function read(request: Request, response: ServerResponse, operation: () => Promise<unknown>) { try {
        respond(request, response, 200, await operation());
    }
    catch (error) {
        if (error instanceof HttpException)
            throw error;
        throw failure(error);
    } }
    @Controller('directory')
    class DirectoryController {
        @Get('specialties')
        specialties(
        @Req()
        req: Request,
        @Res()
        res: ServerResponse) { return read(req, res, () => store.listSpecialties(parseDirectoryQuery(req.url ?? '', false))); }
        @Get('clinics')
        clinics(
        @Req()
        req: Request,
        @Res()
        res: ServerResponse) { return read(req, res, () => store.listClinics(parseDirectoryQuery(req.url ?? '', false))); }
        @Get('providers')
        providers(
        @Req()
        req: Request,
        @Res()
        res: ServerResponse) { return read(req, res, () => store.listProviders(parseDirectoryQuery(req.url ?? '', true) as ProviderPage)); }
        @Get('providers/:publicId')
        provider(
        @Req()
        req: Request,
        @Res()
        res: ServerResponse) { return read(req, res, async () => { if (req.url?.includes('?'))
            throw invalid(); return { data: await store.getProvider(directoryId(req.params.publicId, true)) }; }); }
    }
    return DirectoryController;
}
