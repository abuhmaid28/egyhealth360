import 'reflect-metadata';
import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { Database } from '@egyhealth/db';
import { bootstrapSmoke } from '@egyhealth/closure-engine';

export async function createApp(database: Database) {
  @Controller('health')
  class HealthController {
    @Get()
    async health() {
      try { await database.check(); }
      catch { throw new ServiceUnavailableException({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Service unavailable' } }); }
      return { data: { status: bootstrapSmoke('ok') } };
    }
  }
  @Module({ controllers: [HealthController] })
  class AppModule {}
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api/v1');
  return app;
}
