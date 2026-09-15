import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { FastifyReply } from 'fastify';

// Mock fetch globally
global.fetch = jest.fn();

describe('HealthController', () => {
  let controller: HealthController;
  let mockReply: Partial<FastifyReply>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);

    // Create mock Fastify reply
    mockReply = {
      code: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    // Clear fetch mock
    (fetch as jest.Mock).mockClear();
  });

  describe('liveness', () => {
    it('should return ok status', () => {
      const result = controller.liveness();

      expect(result.status).toBe('ok');
      expect(result.service).toBe('gateway');
      expect(result.ts).toBeDefined();
      expect(new Date(result.ts).toString()).not.toBe('Invalid Date');
    });
  });

  describe('ready', () => {
    it('should return 200 when all services are healthy', async () => {
      // Mock all services returning healthy
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ checks: { db: true } }),
      });

      await controller.ready(mockReply as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalled();

      const sentBody = (mockReply.send as jest.Mock).mock.calls[0][0];
      expect(sentBody.status).toBe('ok');
      expect(sentBody.healthRate).toBe('100%');
      expect(sentBody.services).toHaveLength(12); // All 12 services checked
    });

    it('should return 200 with degraded status when 80% of services are healthy', async () => {
      // Mock 10 out of 12 services healthy (83%)
      let callCount = 0;
      (fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount <= 10) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ checks: { db: true } }) });
        }
        return Promise.reject(new Error('Service down'));
      });

      await controller.ready(mockReply as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(200);

      const sentBody = (mockReply.send as jest.Mock).mock.calls[0][0];
      expect(sentBody.status).toBe('degraded');
      expect(sentBody.healthRate).toBe('83%');
    });

    it('should return 503 when less than 80% of services are healthy', async () => {
      // Mock only 8 out of 12 services healthy (67%)
      let callCount = 0;
      (fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount <= 8) {
          return Promise.resolve({ ok: true, status: 200, json: async () => ({ checks: { db: true } }) });
        }
        return Promise.reject(new Error('Service down'));
      });

      await controller.ready(mockReply as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(503);

      const sentBody = (mockReply.send as jest.Mock).mock.calls[0][0];
      expect(sentBody.status).toBe('down');
      expect(sentBody.healthRate).toBe('67%');
    });

    it('should handle service timeouts gracefully', async () => {
      // Mock timeout
      (fetch as jest.Mock).mockRejectedValue(new Error('Timeout'));

      await controller.ready(mockReply as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(503);

      const sentBody = (mockReply.send as jest.Mock).mock.calls[0][0];
      expect(sentBody.status).toBe('down');
      expect(sentBody.services.every((s: any) => !s.ok)).toBe(true);
    });

    it('should include latency measurements for each service', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ checks: { db: true } }),
      });

      await controller.ready(mockReply as FastifyReply);

      const sentBody = (mockReply.send as jest.Mock).mock.calls[0][0];
      sentBody.services.forEach((service: any) => {
        expect(service.latencyMs).toBeDefined();
        expect(typeof service.latencyMs).toBe('number');
        expect(service.latencyMs).toBeGreaterThanOrEqual(0);
      });
    });

    it('should check all expected services', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ checks: { db: true } }),
      });

      await controller.ready(mockReply as FastifyReply);

      const sentBody = (mockReply.send as jest.Mock).mock.calls[0][0];
      const serviceNames = sentBody.services.map((s: any) => s.service);

      expect(serviceNames).toContain('auth');
      expect(serviceNames).toContain('catalog');
      expect(serviceNames).toContain('cart');
      expect(serviceNames).toContain('order');
      expect(serviceNames).toContain('payment');
      expect(serviceNames).toContain('dispatch');
      expect(serviceNames).toContain('tracking');
      expect(serviceNames).toContain('notification');
      expect(serviceNames).toContain('ledger');
      expect(serviceNames).toContain('onboarding');
      expect(serviceNames).toContain('referral');
      expect(serviceNames).toContain('comms');
    });

    it('should timeout individual service checks after 2 seconds', async () => {
      // Verify AbortSignal.timeout is called with 2000ms
      const mockAbort = jest.fn();
      (global as any).AbortSignal = {
        timeout: mockAbort.mockReturnValue({}),
      };

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ checks: { db: true } }),
      });

      await controller.ready(mockReply as FastifyReply);

      expect(mockAbort).toHaveBeenCalledWith(2000);
    });
  });
});
