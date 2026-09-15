import { Controller, Get, Res } from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { Public } from '@ore/core';
import { serviceUrl } from './proxy';

@Controller()
export class HealthController {
  @Get('health')
  @Public()
  liveness() {
    return { status: 'ok', service: 'gateway', ts: new Date().toISOString() };
  }

  @Get('ready')
  @Public()
  async ready(@Res() reply: FastifyReply) {
    const checks = await Promise.all(
      (['auth', 'catalog', 'cart', 'order', 'payment', 'dispatch', 'tracking', 'notification', 'ledger', 'onboarding', 'referral', 'comms'] as const).map(async (name) => {
        const start = Date.now();
        try {
          // Probe /health/ready (readiness + DB check) instead of /health (liveness only)
          const res = await fetch(`${serviceUrl(name)}/health/ready`, { signal: AbortSignal.timeout(2000) });
          const body = await res.json().catch(() => ({}));
          return { service: name, ok: res.ok, status: res.status, latencyMs: Date.now() - start, checks: (body as any).checks ?? {} };
        } catch {
          return { service: name, ok: false, status: 0, latencyMs: Date.now() - start, checks: {} };
        }
      }),
    );
    const healthyCount = checks.filter((c) => c.ok).length;
    // Allow degraded state if at least 80% of services are up (production elasticity!)
    const healthPercentage = healthyCount / checks.length;
    const ok = healthPercentage >= 0.8;
    
    const body = {
      status: ok ? (healthPercentage === 1 ? 'ok' : 'degraded') : 'down',
      service: 'gateway',
      ts: new Date().toISOString(),
      healthRate: `${(healthPercentage * 100).toFixed(0)}%`,
      services: checks
    };
    return reply.code(ok ? 200 : 503).send(body);
  }
}
