/** Consistent error envelope: { error: { code, message, statusCode, traceId } } */

import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import * as Sentry from '@sentry/nestjs';
import { requestId, traceId } from './trace';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<FastifyReply>();
    const req = host.switchToHttp().getRequest<FastifyRequest>();
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_ERROR';

    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'BAD_REQUEST';
      message = exception.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`).join('; ') || 'Invalid request';
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') message = body;
      else if (body && typeof body === 'object') {
        const b = body as { message?: string | string[]; error?: string };
        message = Array.isArray(b.message) ? b.message.join('; ') : (b.message ?? b.error ?? 'Error');
      }
      code = status === 400 ? 'BAD_REQUEST' : status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : status === 409 ? 'CONFLICT' : status === 413 ? 'PAYLOAD_TOO_LARGE' : status === 429 ? 'RATE_LIMIT_EXCEEDED' : 'HTTP_ERROR';
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      
      // Send 500-level errors to Sentry
      if (status >= 500) {
        Sentry.captureException(exception, {
          contexts: {
            http: {
              method: req.method,
              url: req.url,
              headers: req.headers,
            },
          },
          tags: {
            traceId: traceId() || requestId(),
          },
        });
      }
      
      message = 'Internal server error';
      code = 'INTERNAL_ERROR';
    }

    // Guards (auth) reject before the telemetry interceptor seeds the ALS context,
    // so fall back to the edge-minted correlation header when present.
    const headerRid = req.headers?.['x-request-id'] as string | undefined;
    const traceIdValue = traceId() || requestId() || headerRid || '';
    void res.status(status).send({
      error: { code, message, statusCode: status, ...(traceIdValue ? { traceId: traceIdValue } : {}) },
    });
  }
}
