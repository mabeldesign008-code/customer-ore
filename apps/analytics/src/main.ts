import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@ore/core';
import { corsOrigin, hydrateSecretsManager, loadEnv } from '@ore/config';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  await hydrateSecretsManager();
  const env = loadEnv();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.enableCors({ origin: corsOrigin() });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = env.servicePort('analytics');
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`analytics-service listening on :${port}`);
}
void bootstrap();
