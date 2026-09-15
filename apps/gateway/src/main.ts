import 'reflect-metadata';
import { HttpException, HttpStatus } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { DEFAULT_BODY_BYTES, MAX_UPLOAD_BODY_BYTES, corsOrigin, hydrateSecretsManager, loadEnv } from '@ore/config';
import { proxyRoutes } from './proxy';
import { INTERNAL_TRUST_HEADERS, MAX_CACHEABLE_BYTES, isCacheablePath, isInternalPath, isMediaUploadPath } from './edge-guards';
import { newSpanId, newTraceId } from '@ore/core';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  await hydrateSecretsManager();
  const env = loadEnv();
  // Raised to the largest body any route may carry; the per-path policy in the onRequest
  // hook below is what actually narrows it to 1 MB for everything that is not an upload.
  // Leaving this at Fastify's 1 MB default made that policy unreachable (audit F-BUG-11).
  const adapter = new FastifyAdapter({
    bodyLimit: MAX_UPLOAD_BODY_BYTES,
    connectionTimeout: 30000,
    keepAliveTimeout: 30000,
    // OFF unless TRUST_PROXY is set — see OreEnv.trustProxy. The gateway is the public edge,
    // so blindly trusting X-Forwarded-For would let any caller choose the `req.ip` that
    // downstream rate limiting and webhook allowlists key on. Set it to the ingress/LB CIDR
    // list in production (or `true` on a staging tunnel) rather than leaving it implicit.
    ...(env.trustProxy ? { trustProxy: env.trustProxy } : {}),
  });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, { bufferLogs: true });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.enableCors({
    origin: corsOrigin(),
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'traceparent'],
    exposedHeaders: ['X-Request-Id', 'X-Cache-Status', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    credentials: true,
  });

  const instance = app.getHttpAdapter().getInstance();

  // Edge trust boundary + correlation. Registered before every other hook so that a
  // request the edge refuses is refused before any other plugin spends work on it.
  instance.addHook('onRequest', async (req, reply) => {
    const path = (req.url ?? '').split('?')[0];

    // Strip forged service-trust headers before anything else looks at the request.
    for (const h of INTERNAL_TRUST_HEADERS) {
      delete (req.headers as Record<string, unknown>)[h];
    }

    if (isInternalPath(path)) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Not found', statusCode: 404 } });
    }

    // Correlation IDs — mint once at the edge, propagate to every service.
    if (!req.headers['x-request-id']) {
      const rid = `req-${newTraceId().slice(0, 12)}`;
      req.headers['x-request-id'] = rid;
      void reply.header('x-request-id', rid);
    } else {
      void reply.header('x-request-id', req.headers['x-request-id']);
    }
    if (!req.headers['traceparent']) {
      const traceId = newTraceId();
      const spanId = newSpanId();
      req.headers['traceparent'] = `00-${traceId}-${spanId}-01`;
    }
    void reply.header('traceparent', req.headers['traceparent']);

    // Reject oversized bodies at the edge with 413.
    //
    // The default 1 MB cap 413'd the product's own upload flows (KYC selfies, errand
    // receipts, delivery proof photos, catalog media) — those are base64 JSON payloads
    // of 10–50 MB, so anything above ~750 KB of binary failed at the edge (audit
    // F-BUG-7). Upload routes get a 50 MB budget; everything else stays tight.
    const contentLength = Number(req.headers['content-length'] ?? 0);
    if (Number.isFinite(contentLength)) {
      const contentType = String(req.headers['content-type'] ?? '').toLowerCase();
      const isJson = contentType.includes('application/json');
      // Enforce default 1MB limit for JSON even on media paths to prevent event-loop starvation
      const limit = (isMediaUploadPath(path) && !isJson) ? MAX_UPLOAD_BODY_BYTES : DEFAULT_BODY_BYTES;
      if (contentLength > limit) {
        return reply.code(413).send({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large', statusCode: 413 } });
      }
    }
  });

  // Register @fastify/circuit-breaker globally so it provides app.circuitBreaker()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  await instance.register(require('@fastify/circuit-breaker'), {
    threshold: 5,
    resetTimeout: 60000, // 60s cooldown
    // @fastify/circuit-breaker treats the return value of these handlers as the PAYLOAD:
    //   const errorPayload = await route.onCircuitOpen(req, reply)
    //   return reply.send(errorPayload)
    // Returning `reply.code(x).send(y)` hands it the Reply instance, so it calls
    // reply.send(reply) on an already-sent reply — which surfaced as
    // "Maximum call stack size exceeded", a ServerResponse listener leak and
    // ERR_HTTP_HEADERS_SENT, taking the gateway process down. Mutate the reply and
    // return the payload instead.
    //
    // The payload must be a **pre-serialised string**, not an object. The plugin calls
    // these from two places: its preHandler, where the reply is clean and Fastify would
    // happily serialise an object, and its *onSend* hook on the request that actually
    // trips the breaker — by which point a payload is already set and the content-type is
    // no longer JSON. Handing an object to that second path made Fastify raise
    // FST_ERR_REP_INVALID_PAYLOAD_TYPE and return *that* to the client, so exactly one
    // request per outage answered with a raw Fastify error instead of the envelope.
    //
    // These are set globally rather than per route: the plugin resolves
    // `opts.onCircuitOpen || globalOnCircuitOpen`, so every route inherits them and there
    // is one definition to keep correct.
    onCircuitOpen: async (_req: any, reply: any) => {
      _req.log.fatal({ url: _req.url }, 'CIRCUIT BREAKER OPEN: Upstream service failure threshold exceeded. Failing fast.');
      void reply.header('X-Circuit-Status', 'OPEN');
      reply.code(503).header('content-type', 'application/json; charset=utf-8');
      return JSON.stringify({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Circuit breaker is currently OPEN for this service. Fail-fast mode is active.',
          statusCode: 503,
        },
      });
    },
    onTimeout: async (_req: any, reply: any) => {
      void reply.header('X-Circuit-Status', 'TIMEOUT');
      reply.code(504).header('content-type', 'application/json; charset=utf-8');
      return JSON.stringify({
        error: {
          code: 'GATEWAY_TIMEOUT',
          message: 'Service request timed out.',
          statusCode: 504,
        },
      });
    }
  });

  // Register @fastify/caching to handle cache headers and provide instance.cache
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  await instance.register(require('@fastify/caching'), {
    privacy: 'public',
    expiresIn: 60
  });

  // Edge cache write-back & metrics headers
  instance.addHook('onSend', async (req, reply, payload) => {
    if (!isCacheablePath(req.method, req.url ?? '') || reply.statusCode !== 200 || !payload) {
      return payload;
    }

    // Never re-cache what we just served from cache: the read hook already set HIT, and
    // re-storing it would refresh the TTL forever and pin a stale entry.
    if (reply.getHeader('X-Cache-Status') === 'HIT') return payload;

    // Normalise the payload to a string we can store AND return.
    //
    // The previous version did `Buffer.isBuffer(payload) ? payload.toString() :
    // String(payload)`. For a proxied route the payload is neither a Buffer nor a
    // string — @fastify/http-proxy hands onSend an undici `BodyReadable` stream, and
    // `String(stream)` is the literal text "[object Object]". That 15-byte string was
    // written into the cache and then served, verbatim and with a JSON content-type, to
    // every subsequent request for the same URL (audit F-BUG-9). The first request to a
    // catalog page worked and every one for the next 60 seconds returned garbage, which
    // is precisely the sort of thing no unit test sees and every user does.
    let body: string;
    if (typeof payload === 'string') {
      body = payload;
    } else if (Buffer.isBuffer(payload)) {
      body = payload.toString('utf8');
    } else if (payload && typeof (payload as any).pipe === 'function') {
      // A stream can only be read once, so we buffer it here and hand the buffered copy
      // back as the replacement payload — the client still gets its bytes.
      const chunks: Buffer[] = [];
      let total = 0;
      try {
        for await (const chunk of payload as AsyncIterable<Buffer | string>) {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          total += buf.length;
          if (total > MAX_CACHEABLE_BYTES) {
            // Too big to cache. We have already consumed part of the stream, so we must
            // still return everything we read plus the rest — drain and pass through.
            chunks.push(buf);
            for await (const rest of payload as AsyncIterable<Buffer | string>) {
              chunks.push(Buffer.isBuffer(rest) ? rest : Buffer.from(rest));
            }
            void reply.header('X-Cache-Status', 'BYPASS');
            return Buffer.concat(chunks);
          }
          chunks.push(buf);
        }
      } catch (err) {
        req.log.error(err, 'Cache write: failed reading upstream payload');
        return payload;
      }
      body = Buffer.concat(chunks).toString('utf8');
    } else {
      // Unknown payload shape — pass it through untouched rather than guess and corrupt it.
      return payload;
    }

    const headers = { 'content-type': reply.getHeader('content-type') as string };
    (instance as any).cache.set(req.url, { body, headers }, 60000, (err: any) => {
      if (err) req.log.error(err, 'Cache write error');
    });
    void reply.header('X-Cache-Status', 'MISS');
    // @fastify/caching decorates reply with `etag` and `expires` — there is no
    // `cacheControl` method (v9.0.4). Calling one threw inside onSend, after headers
    // were already flushed, which surfaced downstream as ERR_HTTP_HEADERS_SENT and
    // took the gateway process down. `expires({ maxAge })` is the supported call.
    //
    // It is passed a Date, not an options object: `expires({ maxAge: 60 })` stringified
    // the object into the header, which is where `Expires: [object Object]` came from.
    if (typeof (reply as any).expires === 'function') {
      (reply as any).expires(new Date(Date.now() + 60_000));
    }
    void reply.header('cache-control', 'public, max-age=60');

    // Return the buffered body — the original stream has been consumed.
    return body;
  });


  // eslint-disable-next-line @typescript-eslint/no-require-imports
  await instance.register(require('@fastify/helmet'), {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
    frameguard: { action: 'deny' },
    hsts: env.nodeEnv === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    noSniff: true,
    hidePoweredBy: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  });

  // Gzip Compression edge support
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  await instance.register(require('@fastify/compress'), {
    threshold: 1024, // Compress responses > 1KB
    encodings: ['gzip', 'deflate'],
  });

  // Dynamic Rate-Limiting by JWT 'sub' ID — uses Redis store when REDIS_URL is set (distributed),
  // falls back to in-memory for local dev / single-node setups.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rateLimitOptions: Record<string, any> = {
    // Audit M-2: from loadEnv — typed, validated, hydrated once at boot.
    max: env.rateLimitMax,
    timeWindow: env.rateLimitWindow,
    allowList: (req: { url?: string }) => {
      const path = (req.url ?? '').split('?')[0];
      return path === '/health' || path === '/ready' || path === '/metrics';
    },
    keyGenerator: (req: any) => {
      // Decode JWT sub on the fly for per-user limits (lightweight Base64 — no verify needed here)
      const auth = req.headers['authorization'] as string | undefined;
      if (auth?.startsWith('Bearer ')) {
        try {
          const token = auth.slice(7);
          const parts = token.split('.');
          if (parts.length === 3) {
            // JWT segments are base64URL-encoded; Node's 'base64' decoder silently
            // drops the '-'/'_' characters, which corrupted or collided rate-limit
            // keys for users whose sub encoded to those chars (audit F-BUG-5).
            const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
            if (payload && payload.sub) {
              return `jwt:${payload.sub}`;
            }
          }
        } catch {
          // fall back to IP
        }
      }
      return req.ip;
    },
    // @fastify/rate-limit *throws* whatever this returns (index.js: `throw
    // params.errorResponseBuilder(...)`). It must therefore be an Error, and specifically
    // an HttpException, or AllExceptionsFilter cannot read a status off it and every
    // throttled request answers 500 INTERNAL_ERROR instead of 429 (audit F-BUG-8).
    //
    // That inversion was worse than a wrong number on the wire: clients treat 5xx as
    // "the server is broken, retry" and 429 as "back off", so the gateway told every
    // abusive or merely enthusiastic client to try again immediately, at exactly the
    // moment it was trying to shed load. It also reported abuse as an outage on the
    // 5xx dashboards and burned the error budget.
    //
    // Retry-After does not need to be in the body: the plugin has already set it as a
    // response header (addHeaders below) before this throw, which is where the standard
    // puts it. The envelope is left to the filter so it matches every other error the
    // platform emits.
    errorResponseBuilder: (_req: any, _context: { max: number; ttl: number }) =>
      new HttpException('Too many requests. Please slow down.', HttpStatus.TOO_MANY_REQUESTS),
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  };

  // Connect to Redis for distributed rate limiting when a REDIS_URL is configured
  const redisUrl = env.redisUrl || undefined;
  if (redisUrl) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Redis = require('ioredis');
      const redis = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
      rateLimitOptions.redis = redis;
      logger.log('Rate limiter: Redis store configured');
    } catch (err: any) {
      logger.warn(`Rate limiter: Redis store unavailable (${err.message}), falling back to in-memory`);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  await instance.register(require('@fastify/rate-limit'), rateLimitOptions);

  // Edge cache read interceptor.
  //
  // This is a `preHandler`, not an `onRequest`, and that is load-bearing. It short-circuits
  // the request when it can answer from cache, so it must not run before the rate limiter
  // — while it did, every cache hit was unmetered (audit F-SEC-24), and the cacheable
  // routes are exactly the public browse and search endpoints, i.e. the whole discovery
  // surface of the product with no throttle on it.
  //
  // Registering it after @fastify/rate-limit is not sufficient to fix that: the plugin
  // attaches itself per-route via an `onRoute` hook, and route-level onRequest hooks
  // always run after every global onRequest hook, whatever the registration order. The
  // first stage that reliably runs after a route-level onRequest is preHandler. Only GETs
  // are cacheable, so there is no request body to have been consumed by this point.
  instance.addHook('preHandler', async (req, reply) => {
    if (!isCacheablePath(req.method, req.url ?? '')) return;
    try {
      const cached = await new Promise<any>((resolve, reject) => {
        (instance as any).cache.get(req.url, (err: any, res: any) => {
          if (err) reject(err);
          else resolve(res?.item);
        });
      });
      if (cached && typeof cached.body === 'string') {
        void reply
          .header('X-Cache-Status', 'HIT')
          .header('content-type', cached.headers['content-type'] || 'application/json')
          .code(200)
          .send(cached.body);
        return reply; // bypass upstream request
      }
    } catch (err) {
      req.log.error(err, 'Cache read error');
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  await instance.register(require('@fastify/websocket'));

  // Error envelope for errors raised outside Nest.
  //
  // The proxy routes are registered straight onto Fastify by @fastify/http-proxy, so they
  // never pass through Nest's AllExceptionsFilter. Anything a Fastify hook throws on one
  // of them — the rate limiter's 429, a circuit-breaker trip — was therefore serialised
  // with Fastify's default `{statusCode, error, message}` shape while every other error
  // in the platform uses `{error:{code,message,statusCode,traceId}}`. Clients read
  // `error.code` to decide whether to back off, and got undefined precisely when the edge
  // was asking them to slow down.
  //
  // Nest routes are unaffected: Nest handles their errors internally and this only sees
  // what escapes to Fastify.
  instance.setErrorHandler((err: any, req, reply) => {
    const status = Number(err?.statusCode ?? err?.status ?? 500);
    const code =
      status === 400 ? 'BAD_REQUEST'
      : status === 401 ? 'UNAUTHORIZED'
      : status === 403 ? 'FORBIDDEN'
      : status === 404 ? 'NOT_FOUND'
      : status === 409 ? 'CONFLICT'
      : status === 413 ? 'PAYLOAD_TOO_LARGE'
      : status === 429 ? 'RATE_LIMIT_EXCEEDED'
      : status === 503 ? 'SERVICE_UNAVAILABLE'
      : status >= 500 ? 'INTERNAL_ERROR'
      : 'HTTP_ERROR';
    if (status >= 500) { req.log.error(err, 'edge error'); console.error('EDGE ERROR CAUGHT BY GATEWAY:', err, err.stack); }
    const traceId = (req.headers['x-request-id'] as string | undefined) ?? '';
    // Guard and pre-serialise. On the request that trips the circuit breaker two error
    // paths can touch the same reply, and by the second one the content-type is no longer
    // JSON — sending a plain object there made Fastify raise
    // FST_ERR_REP_INVALID_PAYLOAD_TYPE and leak *that* to the client instead of the
    // envelope. A string with an explicit content-type cannot hit that path.
    if (reply.sent || reply.raw?.headersSent) return;
    void reply
      .status(status)
      .header('content-type', 'application/json; charset=utf-8')
      .send(
        JSON.stringify({
          error: {
            code,
            // Never leak an internal failure's message to the client.
            message: status >= 500 ? 'Internal server error' : (err?.message ?? 'Error'),
            statusCode: status,
            ...(traceId ? { traceId } : {}),
          },
        }),
      );
  });

  for (const route of proxyRoutes(env.rawEnv)) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    await instance.register(require('@fastify/http-proxy'), {
      upstream: route.upstream,
      prefix: route.prefix,
      rewritePrefix: route.rewritePrefix,
      http2: false,
      websocket: route.websocket === true,
      preHandler: (instance as any).circuitBreaker({
        threshold: 5,
        resetTimeout: 60000,
        timeout: route.timeout || 15000, // Explicit Connection & Request Timeout
        // onCircuitOpen / onTimeout are inherited from the global registration above.
      }),
      replyOptions: {
        // Handle upstream failures ourselves. Without this, a request *with a body* to an
        // unreachable service killed the gateway process outright (audit F-BUG-10):
        // @fastify/http-proxy let the transport error escape while the response was
        // already partly committed, Fastify's fallback error handler then called
        // writeHead on it, and the resulting ERR_HTTP_HEADERS_SENT surfaced as an
        // uncaught exception. One POST to any service that happened to be restarting
        // took down the only public process — and since the client would retry, it took
        // it down again on the way back up.
        //
        // A GET survived because nothing had been written yet; only the body-carrying
        // path committed the response early, which is why this never showed up in
        // ordinary browsing.
        onError: (reply: any, { error }: { error: any }) => {
          if (reply.sent || reply.raw?.headersSent) {
            // Too late to say anything useful; drop the socket rather than throw.
            reply.raw?.destroy?.();
            return;
          }
          // Reaching here always means the upstream *transport* failed — real HTTP
          // statuses from a service are streamed back to the client and never routed
          // here — so `error.statusCode` is the gateway's own placeholder 500 and must
          // not be echoed. 503 is the honest answer: the service is unavailable, and
          // it tells clients and load balancers to retry elsewhere.
          //
          // The body is pre-serialised. Handing this hook a plain object made Fastify
          // reject it with FST_ERR_REP_INVALID_PAYLOAD_TYPE once the circuit breaker had
          // already touched the reply, which put us back to leaking a non-envelope error.
          reply
            .code(503)
            .header('content-type', 'application/json; charset=utf-8')
            .send(
              JSON.stringify({
                error: {
                  code: 'SERVICE_UNAVAILABLE',
                  message: 'Upstream service is unavailable',
                  statusCode: 503,
                },
              }),
            );
          reply.log?.warn?.(`upstream unreachable: ${error?.code ?? error?.message ?? 'unknown'}`);
        },
      },
      http: {
        requestOptions: {
          timeout: route.timeout || 15000
        }
      },
      // No automatic retries. @fastify/http-proxy's `retries` option applies to
      // EVERY method — the old value of 2 for /api/auth and /api/catalog retried
      // POSTs too (OTP verifies, catalog writes) on 5xx, double-executing them
      // (audit F-BUG-6). Clients retry their own GETs.
      retries: 0
    });
  }

  const port = env.servicePort('gateway');
  await app.listen(port, '0.0.0.0');

  // Last line of defence for the only internet-facing process.
  //
  // A single malformed request used to be able to end this process (audit F-BUG-10), and
  // an edge that dies takes every service with it however healthy they are. The specific
  // bug is fixed above, but the class of bug — something throws after the response is
  // already committed, so there is no reply left to fail — is one an edge should survive
  // rather than one it should be surprised by.
  //
  // Only the post-response transport errors are swallowed. Anything else is genuinely
  // unknown state, so we log it and let the process die and be restarted, which is the
  // right call for an unknown fault.
  const survivable = new Set(['ERR_HTTP_HEADERS_SENT', 'ECONNRESET', 'EPIPE', 'ERR_STREAM_WRITE_AFTER_END']);
  process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
    if (survivable.has(err?.code ?? '')) {
      logger.error(`edge survived an uncaught ${err.code}: ${err.message}`);
      return;
    }
    logger.error(`fatal uncaught exception: ${err?.stack ?? err}`);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason: any) => {
    if (survivable.has(reason?.code ?? '')) {
      logger.error(`edge survived an unhandled ${reason.code}: ${reason.message}`);
      return;
    }
    logger.error(`unhandled rejection: ${reason?.stack ?? reason}`);
  });

  logger.log(`gateway listening on :${port}`);
  logger.log(`proxy routes: ${proxyRoutes(env.rawEnv).map((r) => r.prefix).join(', ')}`);
}
void bootstrap();
