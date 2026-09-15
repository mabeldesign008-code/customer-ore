import 'reflect-metadata';
import multipart from '@fastify/multipart';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@ore/core';
import { MAX_UPLOAD_BODY_BYTES, corsOrigin, hydrateSecretsManager, loadEnv } from '@ore/config';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  await hydrateSecretsManager();
  const env = loadEnv();
  // Upload-bearing service: KYC documents, catalog media, delivery proof and prescription
  // scans arrive as base64 JSON well over Fastify's 1 MB default (audit F-BUG-11).
  const adapter = new FastifyAdapter({ bodyLimit: MAX_UPLOAD_BODY_BYTES });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(app.get(Logger));
  app.enableCors({ origin: corsOrigin() });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  // Nest's Fastify adapter and the multipart plugin expose compatible runtime
  // APIs but currently publish incompatible generic TypeScript provider types.
  await app.getHttpAdapter().getInstance().register(multipart as any, {
    limits: {
      fileSize: 10 * 1024 * 1024,
      files: 12,
      parts: 24,
    },
  });

  const port = env.servicePort('onboarding');
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`onboarding-service listening on :${port}`);
}
void bootstrap();
