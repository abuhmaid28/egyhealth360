import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { CanActivate, Controller, Get, HttpCode, HttpException, Post, Req, Res, UseGuards } from '@nestjs/common';
import { canonicalizeEmail, type AuthPersistence, type AuthPrincipal } from '@egyhealth/db';
import type { AuthConfiguration } from '@egyhealth/config';
import { canonicalBytes, createPasswordVerifier } from './password.js';

type Request = IncomingMessage & { body?: unknown; principal?: AuthPrincipal };
export type AuthRuntime = { store: AuthPersistence; config: AuthConfiguration; passwords: Awaited<ReturnType<typeof createPasswordVerifier>> };

export function authError(status: number, code: string, message: string): HttpException {
  return new HttpException({ error: { code, message } }, status);
}
const invalid = () => authError(401, 'AUTH_INVALID_CREDENTIALS', 'Invalid credentials.');
const unauthenticated = () => authError(401, 'AUTH_UNAUTHENTICATED', 'Authentication required.');
const csrfFailure = () => authError(403, 'AUTH_CSRF_INVALID', 'Request verification failed.');

function singleHeader(request: IncomingMessage, name: string): string | undefined {
  let count = 0;
  for (let i = 0; i < request.rawHeaders.length; i += 2) if (request.rawHeaders[i].toLowerCase() === name) count++;
  const value = request.headers[name];
  return count === 1 && typeof value === 'string' ? value : undefined;
}

export function sessionCredential(request: IncomingMessage, cookieName: string): Buffer | null {
  const header = singleHeader(request, 'cookie');
  if (!header) return null;
  const matches = header.split(';').map(part => part.trim()).filter(part => part.split('=', 1)[0] === cookieName);
  if (matches.length !== 1) return null;
  const value = matches[0].slice(cookieName.length + 1);
  return value.length === 43 ? canonicalBytes(value, 32) : null;
}
export function sessionHash(credential: Buffer): string { return createHash('sha256').update(credential).digest('hex'); }
export function csrfToken(credential: Buffer): string {
  return createHmac('sha256', credential).update('egyhealth360:csrf:v1', 'utf8').digest('base64url');
}

export function verifyOrigin(request: IncomingMessage, config: AuthConfiguration): void {
  const site = singleHeader(request, 'sec-fetch-site');
  const hasSite = request.rawHeaders.some((value, i) => i % 2 === 0 && value.toLowerCase() === 'sec-fetch-site');
  if (singleHeader(request, 'origin') !== config.origin
    || (hasSite && (!site || !['same-origin', 'same-site', 'none'].includes(site)))) throw csrfFailure();
}

export function requireJson(request: IncomingMessage): void {
  const type = singleHeader(request, 'content-type');
  if (!type || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(type)) {
    throw authError(415, 'REQUEST_CONTENT_TYPE_INVALID', 'Unsupported content type.');
  }
}

export function sessionCookie(config: AuthConfiguration, token: string | null, expiresAt?: Date): string {
  const expiry = token && expiresAt ? expiresAt : new Date(0);
  const age = token ? Math.max(0, Math.floor((expiry.getTime() - Date.now()) / 1000)) : 0;
  return `${config.cookieName}=${token ?? ''}; Path=/; HttpOnly;${config.production ? ' Secure;' : ''} SameSite=Lax; Max-Age=${age}; Expires=${expiry.toUTCString()}`;
}

function result(principal: AuthPrincipal, credential: Buffer) {
  return { data: {
    user: { id: principal.userId, email: principal.email, role: principal.role },
    session: { expiresAt: principal.expiresAt.toISOString() }, csrfToken: csrfToken(credential),
  } };
}

export class SessionAuthenticator {
  constructor(private readonly runtime: AuthRuntime) {}
  async resolve(request: Request, response: ServerResponse): Promise<AuthPrincipal> {
    const credential = sessionCredential(request, this.runtime.config.cookieName);
    const principal = credential ? await this.runtime.store.resolve(sessionHash(credential)) : null;
    if (!principal) {
      response.setHeader('Set-Cookie', sessionCookie(this.runtime.config, null));
      throw unauthenticated();
    }
    request.principal = principal;
    return principal;
  }
}

export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authenticator: SessionAuthenticator) {}
  async canActivate(context: import('@nestjs/common').ExecutionContext) {
    const http = context.switchToHttp();
    await this.authenticator.resolve(http.getRequest<Request>(), http.getResponse<ServerResponse>());
    return true;
  }
}

export class CsrfGuard implements CanActivate {
  constructor(private readonly config: AuthConfiguration) {}
  canActivate(context: import('@nestjs/common').ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    verifyOrigin(request, this.config);
    const credential = sessionCredential(request, this.config.cookieName);
    const header = singleHeader(request, 'x-csrf-token');
    const supplied = header?.length === 43 ? canonicalBytes(header, 32) : null;
    if (!credential || !supplied || !timingSafeEqual(supplied, Buffer.from(csrfToken(credential), 'base64url'))) throw csrfFailure();
    return true;
  }
}

export function authController(runtime: AuthRuntime) {
  const authenticator = new SessionAuthenticator(runtime);
  const sessionGuard = new SessionAuthGuard(authenticator);
  const csrfGuard = new CsrfGuard(runtime.config);

  @Controller('auth')
  class AuthController {
    @Post('login')
    @HttpCode(200)
    async login(@Req() request: Request, @Res({ passthrough: true }) response: ServerResponse) {
      // Keep the credential entry point protected even if routing changes later.
      verifyOrigin(request, runtime.config);
      if (singleHeader(request, 'x-eh-login') !== '1') throw csrfFailure();
      requireJson(request);
      const body = request.body;
      const object = typeof body === 'object' && body !== null && !Array.isArray(body) ? body as Record<string, unknown> : {};
      const password = typeof object.password === 'string' ? Buffer.from(object.password, 'utf8') : Buffer.alloc(0);
      let email: string | undefined;
      const shape = Object.keys(object).length === 2 && typeof object.email === 'string'
        && Buffer.byteLength(object.email, 'utf8') <= 1024 && password.length >= 1 && password.length <= 1024;
      if (shape) { try { email = canonicalizeEmail(object.email as string); } catch { /* generic failure */ } }
      const credentials = email ? await runtime.store.credentials(email) : null;
      let matches: boolean;
      try { matches = await runtime.passwords.verify(password.length <= 1024 ? password : Buffer.alloc(0), credentials?.passwordHash); }
      finally { password.fill(0); }
      if (!matches || !credentials || credentials.status !== 'ACTIVE') throw invalid();
      const credential = randomBytes(32);
      const previous = sessionCredential(request, runtime.config.cookieName);
      const principal = await runtime.store.createSession({
        userId: credentials.id, verifiedHash: credentials.passwordHash,
        tokenHash: sessionHash(credential), previousHash: previous ? sessionHash(previous) : null,
      });
      if (!principal) throw invalid();
      response.setHeader('Set-Cookie', sessionCookie(runtime.config, credential.toString('base64url'), principal.expiresAt));
      return result(principal, credential);
    }

    @Get('me')
    @UseGuards(sessionGuard)
    me(@Req() request: Request) {
      return result(request.principal!, sessionCredential(request, runtime.config.cookieName)!);
    }

    @Post('logout')
    @HttpCode(204)
    @UseGuards(sessionGuard, csrfGuard)
    async logout(@Req() request: Request, @Res({ passthrough: true }) response: ServerResponse) {
      if (!request.body || typeof request.body !== 'object' || Array.isArray(request.body) || Object.keys(request.body).length !== 0) {
        throw authError(400, 'REQUEST_INVALID', 'Invalid request.');
      }
      const credential = sessionCredential(request, runtime.config.cookieName)!;
      if (!await runtime.store.revoke(sessionHash(credential))) {
        response.setHeader('Set-Cookie', sessionCookie(runtime.config, null));
        throw unauthenticated();
      }
      response.setHeader('Set-Cookie', sessionCookie(runtime.config, null));
    }
  }
  return AuthController;
}

/** Runs ahead of body parsing, so hostile origins cannot trigger credential work. */
export function authRequestBoundary(runtime: AuthRuntime) {
  return (request: Request, response: ServerResponse, next: (error?: unknown) => void) => {
    // Express accepts case variants and optional trailing slashes by default.
    const path = request.url?.split('?', 1)[0].toLowerCase().replace(/\/+$/, '');
    if (!['/api/v1/auth/login', '/api/v1/auth/logout', '/api/v1/auth/me'].includes(path ?? '')) return next();
    response.setHeader('Cache-Control', 'no-store');
    try {
      if (request.method === 'POST' && path !== '/api/v1/auth/me') {
        verifyOrigin(request, runtime.config);
        if (path === '/api/v1/auth/login' && singleHeader(request, 'x-eh-login') !== '1') throw csrfFailure();
        requireJson(request);
      }
      next();
    } catch (error) {
      const failure = error instanceof HttpException ? error : authError(503, 'AUTH_SERVICE_UNAVAILABLE', 'Service unavailable.');
      response.statusCode = failure.getStatus();
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(failure.getResponse()));
    }
  };
}
