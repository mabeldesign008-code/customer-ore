import { HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './filter';

/**
 * Regression test for audit F-BUG-8.
 *
 * @fastify/rate-limit throws whatever its `errorResponseBuilder` returns. The gateway's
 * builder returned a plain object literal, which is not an Error, so this filter fell
 * through to its default branch and answered 500 INTERNAL_ERROR for every throttled
 * request. Clients retry 5xx and back off on 429, so the gateway was telling abusive
 * traffic to retry immediately at the exact moment it was shedding load.
 *
 * The fix is on both sides: the builder now returns an HttpException, and the filter
 * maps 429 to the documented RATE_LIMIT_EXCEEDED code rather than the generic
 * HTTP_ERROR.
 */
function invoke(exception: unknown) {
  const sent: { status?: number; body?: any } = {};
  const reply = {
    status(code: number) {
      sent.status = code;
      return this;
    },
    send(body: any) {
      sent.body = body;
      return this;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => reply,
      getRequest: () => ({ method: 'GET', url: '/api/catalog/vendors', headers: {} }),
    }),
  } as any;

  new AllExceptionsFilter().catch(exception, host);
  return sent;
}

describe('AllExceptionsFilter — throttling (F-BUG-8)', () => {
  it('maps a 429 HttpException to RATE_LIMIT_EXCEEDED, not HTTP_ERROR', () => {
    const sent = invoke(
      new HttpException('Too many requests. Please slow down.', HttpStatus.TOO_MANY_REQUESTS),
    );

    expect(sent.status).toBe(429);
    expect(sent.body.error).toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      message: 'Too many requests. Please slow down.',
    });
  });

  it('answers 500 for a plain object — the shape the old builder returned', () => {
    // This is the pre-fix behaviour, pinned deliberately. It documents *why* the
    // rate-limit builder must return an Error: anything else lands here.
    const sent = invoke({
      error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests.', statusCode: 429 },
    });

    expect(sent.status).toBe(500);
    expect(sent.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('still maps the other documented statuses', () => {
    expect(invoke(new HttpException('nope', 401)).body.error.code).toBe('UNAUTHORIZED');
    expect(invoke(new HttpException('nope', 403)).body.error.code).toBe('FORBIDDEN');
    expect(invoke(new HttpException('nope', 404)).body.error.code).toBe('NOT_FOUND');
    expect(invoke(new HttpException('nope', 409)).body.error.code).toBe('CONFLICT');
    expect(invoke(new HttpException('nope', 413)).body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(invoke(new HttpException('nope', 418)).body.error.code).toBe('HTTP_ERROR');
  });
});
