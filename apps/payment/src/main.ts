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
  // trustProxy is OFF unless TRUST_PROXY is set — see OreEnv.trustProxy. Behind a tunnel or
  // load balancer this is what makes `req.ip` the real Paystack source rather than the proxy.
  const adapter = new FastifyAdapter(env.trustProxy ? { trustProxy: env.trustProxy } : {});
  // rawBody: true → Nest's built-in JSON parser exposes req.rawBody (Buffer),
  // which we verify against the Paystack HMAC-SHA512 signature (G06).
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(app.get(Logger));
  app.enableCors({ origin: corsOrigin() });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  const port = env.servicePort('payment');
  await app.listen(port, '0.0.0.0');
  app.get(Logger).log(`payment-service listening on :${port}`);
}
void bootstrap();
