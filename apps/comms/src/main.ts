import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '@ore/core';
import { corsOrigin, hydrateSecretsManager, loadEnv } from '@ore/config';
import { Logger } from 'nestjs-pino';
import { RedisIoAdapter } from './redis-io.adapter';

async function bootstrap() {
  await hydrateSecretsManager();
  const env = loadEnv();
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), { bufferLogs: true });
  app.useLogger(app.get(Logger));
  
  const redisAdapter = new RedisIoAdapter(app, env.redisUrl);
  await redisAdapter.connectToRedis();
  app.useWebSocketAdapter(redisAdapter);
  
  app.enableCors({ origin: corsOrigin() });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = env.servicePort('comms');
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`comms-service listening on :${port} (ws /comms, path /comms/socket.io)`);
}
void bootstrap();
