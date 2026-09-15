import { proxyRoutes, ProxyRoute } from './proxy';

describe('proxyRoutes', () => {
  describe('route configuration', () => {
    it('should return all expected routes', () => {
      const routes = proxyRoutes({});
      const prefixes = routes.map((r) => r.prefix);

      expect(prefixes).toContain('/api/auth');
      expect(prefixes).toContain('/api/catalog');
      expect(prefixes).toContain('/api/cart');
      expect(prefixes).toContain('/api/order');
      expect(prefixes).toContain('/api/payment');
      expect(prefixes).toContain('/api/dispatch');
      expect(prefixes).toContain('/api/tracking');
      expect(prefixes).toContain('/api/notifications');
      expect(prefixes).toContain('/api/ledger');
      expect(prefixes).toContain('/api/onboarding');
      expect(prefixes).toContain('/api/referral');
      expect(prefixes).toContain('/api/comms');
      expect(prefixes).toContain('/api/content');
      expect(prefixes).toContain('/api/analytics');
    });

    it('has one route per upstream service, and no duplicates', () => {
      const routes = proxyRoutes({});
      // Asserting the set rather than a bare count: a hard-coded length breaks every time a
      // service is added and tells you nothing about which route went missing.
      expect(routes.map((r) => r.prefix).sort()).toEqual([
        '/api/analytics', '/api/auth', '/api/cart', '/api/catalog', '/api/comms', '/api/content',
        '/api/dispatch', '/api/ledger', '/api/notifications', '/api/onboarding',
        '/api/order', '/api/payment', '/api/referral', '/api/tracking',
      ]);
      expect(new Set(routes.map((r) => r.prefix)).size).toBe(routes.length);
    });
  });

  describe('route properties', () => {
    let routes: ProxyRoute[];

    beforeEach(() => {
      routes = proxyRoutes({
        AUTH_URL: 'http://auth:4100',
        CATALOG_URL: 'http://catalog:4200',
        PAYMENT_URL: 'http://payment:4500',
      });
    });

    it('should map auth route correctly', () => {
      const authRoute = routes.find((r) => r.prefix === '/api/auth');

      expect(authRoute).toBeDefined();
      expect(authRoute!.upstream).toBe('http://auth:4100');
      expect(authRoute!.rewritePrefix).toBe('/auth');
      expect(authRoute!.websocket).toBeUndefined();
      expect(authRoute!.timeout).toBe(8000);
    });

    it('should map catalog route correctly', () => {
      const catalogRoute = routes.find((r) => r.prefix === '/api/catalog');

      expect(catalogRoute).toBeDefined();
      expect(catalogRoute!.upstream).toBe('http://catalog:4200');
      expect(catalogRoute!.rewritePrefix).toBe('/');
      expect(catalogRoute!.timeout).toBe(12000);
    });

    it('should map payment route with longer timeout', () => {
      const paymentRoute = routes.find((r) => r.prefix === '/api/payment');

      expect(paymentRoute).toBeDefined();
      expect(paymentRoute!.upstream).toBe('http://payment:4500');
      expect(paymentRoute!.timeout).toBe(30000); // Longest timeout for payment processing
    });

    it('should enable websocket for tracking route', () => {
      const trackingRoute = routes.find((r) => r.prefix === '/api/tracking');

      expect(trackingRoute).toBeDefined();
      expect(trackingRoute!.websocket).toBe(true);
      expect(trackingRoute!.timeout).toBe(15000);
    });

    it('should enable websocket for comms route', () => {
      const commsRoute = routes.find((r) => r.prefix === '/api/comms');

      expect(commsRoute).toBeDefined();
      expect(commsRoute!.websocket).toBe(true);
      expect(commsRoute!.timeout).toBe(15000);
    });
  });

  describe('timeout configuration', () => {
    it('should have appropriate timeouts for different services', () => {
      const routes = proxyRoutes({});
      const timeouts: Record<string, number> = {};

      routes.forEach((route) => {
        const serviceName = route.prefix.replace('/api/', '');
        timeouts[serviceName] = route.timeout!;
      });

      // Verify timeout hierarchy makes sense
      expect(timeouts.payment).toBe(30000); // Longest - external payment processing
      expect(timeouts.order).toBe(20000); // Long - complex order operations
      expect(timeouts.tracking).toBe(15000); // Medium
      expect(timeouts.dispatch).toBe(15000); // Medium
      expect(timeouts.comms).toBe(15000); // Medium
      expect(timeouts.ledger).toBe(15000); // Medium
      expect(timeouts.catalog).toBe(12000); // Medium
      expect(timeouts.cart).toBe(10000); // Short
      expect(timeouts.notifications).toBe(10000); // Short
      expect(timeouts.onboarding).toBe(10000); // Short
      expect(timeouts.referral).toBe(10000); // Short
      expect(timeouts.auth).toBe(8000); // Shortest - should be fast
    });

    it('should have all routes with explicit timeouts', () => {
      const routes = proxyRoutes({});

      routes.forEach((route) => {
        expect(route.timeout).toBeDefined();
        expect(route.timeout).toBeGreaterThan(0);
        expect(route.timeout).toBeLessThanOrEqual(30000);
      });
    });
  });

  describe('prefix patterns', () => {
    it('should have all prefixes starting with /api/', () => {
      const routes = proxyRoutes({});

      routes.forEach((route) => {
        expect(route.prefix).toMatch(/^\/api\//);
      });
    });

    it('should have unique prefixes', () => {
      const routes = proxyRoutes({});
      const prefixes = routes.map((r) => r.prefix);
      const uniquePrefixes = [...new Set(prefixes)];

      expect(prefixes.length).toBe(uniquePrefixes.length);
    });
  });

  describe('rewritePrefix patterns', () => {
    it('should rewrite some routes to root path', () => {
      const routes = proxyRoutes({});
      const rootRewrites = routes.filter((r) => r.rewritePrefix === '/');

      // catalog, order, payment, dispatch, onboarding rewrite to /
      expect(rootRewrites.length).toBeGreaterThan(0);
      expect(rootRewrites.map((r) => r.prefix)).toContain('/api/catalog');
      expect(rootRewrites.map((r) => r.prefix)).toContain('/api/order');
      expect(rootRewrites.map((r) => r.prefix)).toContain('/api/payment');
    });

    it('should keep service name in rewrite for some routes', () => {
      const routes = proxyRoutes({});

      const authRoute = routes.find((r) => r.prefix === '/api/auth');
      expect(authRoute!.rewritePrefix).toBe('/auth');

      const cartRoute = routes.find((r) => r.prefix === '/api/cart');
      expect(cartRoute!.rewritePrefix).toBe('/cart');

      const trackingRoute = routes.find((r) => r.prefix === '/api/tracking');
      expect(trackingRoute!.rewritePrefix).toBe('/tracking');
    });
  });

  describe('environment variable handling', () => {
    it('should use provided environment variables', () => {
      const customEnv = {
        AUTH_URL: 'https://custom-auth.example.com',
        CATALOG_URL: 'https://custom-catalog.example.com',
      };

      const routes = proxyRoutes(customEnv);

      const authRoute = routes.find((r) => r.prefix === '/api/auth');
      expect(authRoute!.upstream).toBe('https://custom-auth.example.com');

      const catalogRoute = routes.find((r) => r.prefix === '/api/catalog');
      expect(catalogRoute!.upstream).toBe('https://custom-catalog.example.com');
    });

    it('should fall back to defaults when env vars not provided', () => {
      const routes = proxyRoutes({});

      // Should have valid URLs (not undefined)
      routes.forEach((route) => {
        expect(route.upstream).toBeDefined();
        expect(route.upstream).toMatch(/^http/);
      });
    });

    it('should handle partial environment configuration', () => {
      const partialEnv = {
        AUTH_URL: 'https://custom-auth.example.com',
        // Other services will use defaults
      };

      const routes = proxyRoutes(partialEnv);

      const authRoute = routes.find((r) => r.prefix === '/api/auth');
      expect(authRoute!.upstream).toBe('https://custom-auth.example.com');

      // Other routes should still be defined with defaults
      const catalogRoute = routes.find((r) => r.prefix === '/api/catalog');
      expect(catalogRoute!.upstream).toBeDefined();
    });
  });

  describe('websocket configuration', () => {
    it('should only enable websocket for specific services', () => {
      const routes = proxyRoutes({});
      const wsRoutes = routes.filter((r) => r.websocket === true);

      expect(wsRoutes).toHaveLength(2);
      expect(wsRoutes.map((r) => r.prefix)).toContain('/api/tracking');
      expect(wsRoutes.map((r) => r.prefix)).toContain('/api/comms');
    });

    it('should not have websocket enabled for non-real-time services', () => {
      const routes = proxyRoutes({});

      const nonWsServices = ['auth', 'catalog', 'cart', 'order', 'payment', 'dispatch'];
      nonWsServices.forEach((service) => {
        const route = routes.find((r) => r.prefix === `/api/${service}`);
        expect(route!.websocket).not.toBe(true);
      });
    });
  });
});
