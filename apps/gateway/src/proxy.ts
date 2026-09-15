/** Gateway → service route map. Inter-service URLs come from env; defaults for local dev. */

import { serviceUrl } from '@ore/config';

export { serviceUrl };

export interface ProxyRoute {
  prefix: string;
  upstream: string;
  rewritePrefix: string;
  websocket?: boolean;
  timeout?: number; // Custom request timeout in milliseconds
}

export function proxyRoutes(env: Record<string, string | undefined> = process.env): ProxyRoute[] {
  return [
    { prefix: '/api/auth', upstream: serviceUrl('auth', env), rewritePrefix: '/auth', timeout: 8000 },
    { prefix: '/api/catalog', upstream: serviceUrl('catalog', env), rewritePrefix: '/', timeout: 12000 },
    { prefix: '/api/cart', upstream: serviceUrl('cart', env), rewritePrefix: '/cart', timeout: 10000 },
    { prefix: '/api/order', upstream: serviceUrl('order', env), rewritePrefix: '/', timeout: 20000 },
    { prefix: '/api/payment', upstream: serviceUrl('payment', env), rewritePrefix: '/', timeout: 30000 },
    { prefix: '/api/dispatch', upstream: serviceUrl('dispatch', env), rewritePrefix: '/', timeout: 15000 },
    { prefix: '/api/tracking', upstream: serviceUrl('tracking', env), rewritePrefix: '/tracking', websocket: true, timeout: 15000 },
    { prefix: '/api/notifications', upstream: serviceUrl('notification', env), rewritePrefix: '/notifications', timeout: 10000 },
    { prefix: '/api/ledger', upstream: serviceUrl('ledger', env), rewritePrefix: '/ledger', timeout: 15000 },
    { prefix: '/api/onboarding', upstream: serviceUrl('onboarding', env), rewritePrefix: '/', timeout: 10000 },
    { prefix: '/api/referral', upstream: serviceUrl('referral', env), rewritePrefix: '/referral', timeout: 10000 },
    // The CMS lives in the comms process (the support AI reads it in-process), but it is a
    // separate public surface, so it gets its own prefix rather than hiding under /api/comms.
    { prefix: '/api/content', upstream: serviceUrl('comms', env), rewritePrefix: '/content', timeout: 10000 },
    { prefix: '/api/comms', upstream: serviceUrl('comms', env), rewritePrefix: '/comms', websocket: true, timeout: 15000 },
    { prefix: '/api/analytics', upstream: serviceUrl('analytics', env), rewritePrefix: '/analytics', timeout: 10000 },
  ];
}
