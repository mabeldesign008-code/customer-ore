import { Test, TestingModule } from '@nestjs/testing';
import { FlagsController } from './flags.controller';
import { ORE_FLAGS, ORE_ENV } from '@ore/core';

// The controller takes the caller first and refuses anyone who is not a super admin, so every
// call needs an identity. These tests are about flag validation, not about the role gate.
const SUPER = { sub: 'admin-1', adminRole: 'super_admin' } as any;

describe('FlagsController', () => {
  let controller: FlagsController;
  let mockFlagsService: {
    all: jest.Mock;
    set: jest.Mock;
    get: jest.Mock;
  };

  beforeEach(async () => {
    mockFlagsService = {
      all: jest.fn(),
      set: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FlagsController],
      providers: [
        {
          provide: ORE_FLAGS,
          useValue: mockFlagsService,
        },
        { provide: ORE_ENV, useValue: {} },
      ],
    }).compile();

    controller = module.get<FlagsController>(FlagsController);
  });

  describe('list', () => {
    it('should return all feature flags', async () => {
      const mockFlags = {
        'enable-bulk-orders': true,
        'enable-scheduled-orders': false,
        'max-cart-items': 50,
      };

      mockFlagsService.all.mockResolvedValue(mockFlags);

      const result = await controller.list();

      expect(result).toEqual({ flags: mockFlags });
      expect(mockFlagsService.all).toHaveBeenCalledTimes(1);
    });

    it('should return empty object when no flags exist', async () => {
      mockFlagsService.all.mockResolvedValue({});

      const result = await controller.list();

      expect(result).toEqual({ flags: {} });
    });

    it('should handle flags service errors', async () => {
      mockFlagsService.all.mockRejectedValue(new Error('Database error'));

      await expect(controller.list()).rejects.toThrow('Database error');
    });
  });

  describe('set', () => {
    it('should set a boolean flag', async () => {
      mockFlagsService.set.mockResolvedValue(undefined);

      const result = await controller.set(SUPER, 'enable-bulk-orders', { value: true });

      expect(result).toEqual({
        ok: true,
        flag: 'enable-bulk-orders',
        value: true,
      });
      expect(mockFlagsService.set).toHaveBeenCalledWith('enable-bulk-orders', true);
    });

    it('should set a string flag', async () => {
      mockFlagsService.set.mockResolvedValue(undefined);

      const result = await controller.set(SUPER, 'maintenance-message', { value: 'System under maintenance' });

      expect(result).toEqual({
        ok: true,
        flag: 'maintenance-message',
        value: 'System under maintenance',
      });
      expect(mockFlagsService.set).toHaveBeenCalledWith(
        'maintenance-message',
        'System under maintenance',
      );
    });

    it('should set a number flag', async () => {
      mockFlagsService.set.mockResolvedValue(undefined);

      const result = await controller.set(SUPER, 'max-cart-items', { value: 100 });

      expect(result).toEqual({
        ok: true,
        flag: 'max-cart-items',
        value: 100,
      });
      expect(mockFlagsService.set).toHaveBeenCalledWith('max-cart-items', 100);
    });

    it('should set false boolean value', async () => {
      mockFlagsService.set.mockResolvedValue(undefined);

      const result = await controller.set(SUPER, 'enable-promotions', { value: false });

      expect(result).toEqual({
        ok: true,
        flag: 'enable-promotions',
        value: false,
      });
      expect(mockFlagsService.set).toHaveBeenCalledWith('enable-promotions', false);
    });

    it('should set zero number value', async () => {
      mockFlagsService.set.mockResolvedValue(undefined);

      const result = await controller.set(SUPER, 'minimum-order', { value: 0 });

      expect(result).toEqual({
        ok: true,
        flag: 'minimum-order',
        value: 0,
      });
      expect(mockFlagsService.set).toHaveBeenCalledWith('minimum-order', 0);
    });

    it('should return error when value is undefined', async () => {
      const result = await controller.set(SUPER, 'test-flag', {} as any);

      expect(result).toEqual({
        ok: false,
        error: 'body.value is required',
      });
      expect(mockFlagsService.set).not.toHaveBeenCalled();
    });

    it('should return error when body is null', async () => {
      const result = await controller.set(SUPER, 'test-flag', null as any);

      expect(result).toEqual({
        ok: false,
        error: 'body.value is required',
      });
      expect(mockFlagsService.set).not.toHaveBeenCalled();
    });

    it('should return error when body is missing', async () => {
      const result = await controller.set(SUPER, 'test-flag', undefined as any);

      expect(result).toEqual({
        ok: false,
        error: 'body.value is required',
      });
      expect(mockFlagsService.set).not.toHaveBeenCalled();
    });

    it('should handle flags service set errors', async () => {
      mockFlagsService.set.mockRejectedValue(new Error('Redis connection failed'));

      await expect(controller.set(SUPER, 'test-flag', { value: true })).rejects.toThrow(
        'Redis connection failed',
      );
    });

    it('should handle flag names with special characters', async () => {
      mockFlagsService.set.mockResolvedValue(undefined);

      const result = await controller.set(SUPER, 'enable-feature.v2-beta_test', { value: true });

      expect(result.ok).toBe(true);
      expect(result.flag).toBe('enable-feature.v2-beta_test');
      expect(mockFlagsService.set).toHaveBeenCalledWith('enable-feature.v2-beta_test', true);
    });

    it('should handle very long flag names', async () => {
      mockFlagsService.set.mockResolvedValue(undefined);

      const longName = 'a'.repeat(200);
      const result = await controller.set(SUPER, longName, { value: 'test' });

      expect(result.ok).toBe(true);
      expect(result.flag).toBe(longName);
    });

    it('should handle empty string as valid value', async () => {
      mockFlagsService.set.mockResolvedValue(undefined);

      const result = await controller.set(SUPER, 'banner-text', { value: '' });

      expect(result).toEqual({
        ok: true,
        flag: 'banner-text',
        value: '',
      });
      expect(mockFlagsService.set).toHaveBeenCalledWith('banner-text', '');
    });
  });

  describe('error handling', () => {
    it('should propagate service errors to caller', async () => {
      const serviceError = new Error('Service unavailable');
      mockFlagsService.all.mockRejectedValue(serviceError);

      await expect(controller.list()).rejects.toThrow(serviceError);
    });

    it('should not catch exceptions from flags service', async () => {
      mockFlagsService.set.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(controller.set(SUPER, 'test', { value: true })).rejects.toThrow('Unexpected error');
    });
  });

  describe('integration scenarios', () => {
    it('should handle rapid flag updates', async () => {
      mockFlagsService.set.mockResolvedValue(undefined);

      const promises = [
        controller.set(SUPER, 'flag1', { value: true }),
        controller.set(SUPER, 'flag2', { value: false }),
        controller.set(SUPER, 'flag3', { value: 'test' }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.ok)).toBe(true);
      expect(mockFlagsService.set).toHaveBeenCalledTimes(3);
    });

    it('should handle listing after setting flags', async () => {
      mockFlagsService.set.mockResolvedValue(undefined);
      mockFlagsService.all.mockResolvedValue({
        'test-flag': true,
      });

      await controller.set(SUPER, 'test-flag', { value: true });
      const listResult = await controller.list();

      expect(listResult.flags['test-flag']).toBe(true);
    });
  });
});
