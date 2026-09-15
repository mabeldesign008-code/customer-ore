/** Pino structured logging with trace context integration */

import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { traceId, requestId } from './trace';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        // Inject trace context into every log
        customProps: () => ({
          traceId: traceId(),
          requestId: requestId(),
        }),

        // Structured JSON in production, pretty-print in development
        transport: process.env.NODE_ENV === 'production'
          ? undefined
          : {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'HH:MM:ss.l',
                ignore: 'pid,hostname',
                singleLine: false,
              },
            },

        // Log level based on environment
        level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),

        // Customize serializers
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            headers: {
              'user-agent': req.headers['user-agent'],
              'x-request-id': req.headers['x-request-id'],
            },
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },

        // Auto-log HTTP requests
        // Redact sensitive headers and fields
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-ore-internal-key"]', 'req.headers["x-ore-internal-mac"]'],
          censor: '[REDACTED]',
        },
        autoLogging: {
          ignore: (req) => req.url === '/health' || req.url === '/metrics',
        },

        // Custom log level for HTTP requests
        customLogLevel: (req, res, err) => {
          if (res.statusCode >= 500 || err) return 'error';
          if (res.statusCode >= 400) return 'warn';
          if (res.statusCode >= 300) return 'info';
          return 'debug';
        },
      },
    }),
  ],
  exports: [LoggerModule],
})
export class OreLoggerModule {}
