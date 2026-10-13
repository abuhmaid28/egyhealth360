import 'reflect-metadata';
import { ArgumentsHost, Catch, Controller, ExceptionFilter, Get, HttpException, Module, ServiceUnavailableException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Database } from '@egyhealth/db';
import { bootstrapSmoke } from '@egyhealth/closure-engine';
import type { ServerResponse } from 'node:http';
import { authController, authError, authRequestBoundary, type AuthRuntime } from './auth.js';

export async function createApp(database: Database, auth?: AuthRuntime) {
  @Controller('health')
  class HealthController {
    @Get()
    async health() {
      try { await database.check(); }
      catch { throw new ServiceUnavailableException({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Service unavailable' } }); }
      return { data: { status: bootstrapSmoke('ok') } };
    }
  }
  @Module({ controllers: auth ? [authController(auth)] : [] })
  class AuthModule {}
  @Module({ controllers: [HealthController], imports: [AuthModule] })
  class AppModule {}
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false, bodyParser: false });
  app.setGlobalPrefix('api/v1');
  if (auth) app.use(authRequestBoundary(auth));
  app.useBodyParser('json', { limit: '16kb', strict: false });
  @Catch()
  class SafeErrors implements ExceptionFilter {
    catch(error: unknown, host: ArgumentsHost) {
      const response = host.switchToHttp().getResponse<ServerResponse>();
      let failure: HttpException;
      const body = error instanceof HttpException ? error.getResponse() : null;
      if (error instanceof HttpException && body !== null && typeof body === 'object' && 'error' in body) failure = error;
      else if (error instanceof HttpException && error.getStatus() === 413) failure = authError(413, 'REQUEST_TOO_LARGE', 'Request too large.');
      else if (error instanceof HttpException && error.getStatus() === 400) failure = authError(400, 'REQUEST_INVALID', 'Invalid request.');
      else if (error instanceof HttpException && error.getStatus() === 404) failure = authError(404, 'ROUTE_NOT_FOUND', 'Not found.');
      else if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') failure = authError(413, 'REQUEST_TOO_LARGE', 'Request too large.');
      else if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.parse.failed') failure = authError(400, 'REQUEST_INVALID', 'Invalid request.');
      else failure = authError(503, 'AUTH_SERVICE_UNAVAILABLE', 'Service unavailable.');
      response.statusCode = failure.getStatus();
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(failure.getResponse()));
    }
  }
  app.useGlobalFilters(new SafeErrors());
  return app;
}
