import 'reflect-metadata';
import {relationshipController,relationshipRequestBoundary} from './relationships.js';
import type {RelationshipPersistence} from '@egyhealth/db';
import { directoryController, directoryRequestBoundary } from './directory.js';
import type { PublicDirectory } from '@egyhealth/db';
import { patientEntryController, patientEntryRequestBoundary, type PatientEntryRuntime } from './patient-entry.js';
import { ArgumentsHost, Catch, Controller, ExceptionFilter, Get, HttpException, Module, ServiceUnavailableException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Database, AuthorizationPersistence, BloodPressureMeasurementPersistence, FollowUpAppointmentPersistence, ClinicalEncounterPersistence } from '@egyhealth/db';
import { followupController, followupRequestBoundary } from './followup.js';
import { bloodPressureController, bloodPressureRequestBoundary } from './blood-pressure.js';
import { patientController, patientRequestBoundary } from './authorization.js';
import { bootstrapSmoke } from '@egyhealth/closure-engine';
import type { ServerResponse } from 'node:http';
import { authController, authError, authRequestBoundary, type AuthRuntime } from './auth.js';

/** Only the exact data envelopes emitted by our error helpers, including the
 * existing BP/follow-up field diagnostics. Nest's { message, error, statusCode }
 * parser/route errors are not application envelopes and must be sanitized. */
function applicationErrorEnvelope(body: unknown): boolean {
  const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object'
    && [Object.prototype, null].includes(Object.getPrototypeOf(value))
    && Reflect.ownKeys(value).every(key => {
      const property = Object.getOwnPropertyDescriptor(value, key)!;
      return typeof key === 'string' && property.enumerable && 'value' in property;
    });
  if (!record(body) || Object.keys(body).length !== 1 || !Object.hasOwn(body, 'error') || !record(body.error)) return false;
  const error = body.error;
  if (!Object.hasOwn(error, 'code') || !Object.hasOwn(error, 'message')
    || Object.keys(error).some(key => !['code', 'message', 'fields'].includes(key))
    || typeof error.code !== 'string' || !/^[A-Z][A-Z0-9_]*$/.test(error.code)
    || typeof error.message !== 'string' || error.message.length === 0) return false;
  return !Object.hasOwn(error, 'fields') || (Array.isArray(error.fields) && Object.getPrototypeOf(error.fields) === Array.prototype
    && Reflect.ownKeys(error.fields).length === error.fields.length + 1 && Array.from(error.fields).every(field => record(field)
    && Object.keys(field).length === 2 && Object.hasOwn(field, 'field') && Object.hasOwn(field, 'reason')
    && typeof field.field === 'string' && typeof field.reason === 'string'));
}

export async function createApp(database: Database, auth?: AuthRuntime, authorization?: AuthorizationPersistence, bloodPressure?: BloodPressureMeasurementPersistence, followup?: { appointments: FollowUpAppointmentPersistence; encounters: ClinicalEncounterPersistence }, patientEntry?: PatientEntryRuntime, directory?: PublicDirectory, relationships?: RelationshipPersistence) {
  @Controller('health')
  class HealthController {
    @Get()
    async health() {
      try { await database.check(); }
      catch { throw new ServiceUnavailableException({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Service unavailable' } }); }
      return { data: { status: bootstrapSmoke('ok') } };
    }
  }
  @Module({ controllers: auth ? [authController(auth), ...(relationships ? [relationshipController(auth,relationships)] : []), ...(patientEntry ? [patientEntryController(auth, patientEntry)] : []), ...(authorization ? [patientController(auth, authorization)] : []), ...(bloodPressure ? [bloodPressureController(auth, bloodPressure)] : []), ...(followup ? [followupController(auth, followup.appointments, followup.encounters)] : [])] : [] })
  class AuthModule {}
  @Module({ controllers: [HealthController, ...(directory ? [directoryController(directory)] : [])], imports: [AuthModule] })
  class AppModule {}
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: false, bodyParser: false });
  app.setGlobalPrefix('api/v1');
  app.use(directoryRequestBoundary);
  if (auth) app.use(authRequestBoundary(auth));
  if (auth && patientEntry) app.use(patientEntryRequestBoundary(auth));
  if (auth && relationships) app.use(relationshipRequestBoundary(auth));
  app.use(patientRequestBoundary);
  if (auth && bloodPressure) app.use(bloodPressureRequestBoundary(auth));
  if (auth && followup) app.use(followupRequestBoundary(auth));
  app.useBodyParser('json', { limit: '16kb', strict: false });
  @Catch()
  class SafeErrors implements ExceptionFilter {
    catch(error: unknown, host: ArgumentsHost) {
      const response = host.switchToHttp().getResponse<ServerResponse>();
      let failure: HttpException;
      const body = error instanceof HttpException ? error.getResponse() : null;
      if (error instanceof HttpException && applicationErrorEnvelope(body)) failure = error;
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
