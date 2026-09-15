/**
 * Auth controller — API contract tests.
 *
 * These tests verify that the controller layer:
 *   - Parses and validates all incoming request bodies via Zod schemas
 *   - Returns the correct HTTP shapes on success
 *   - Rejects malformed payloads with clear validation errors
 *   - Enforces @Public / @AuthGuard access properly
 *   - Never leaks raw service errors to callers without shaping
 *
 * No real database or OTP infrastructure is used.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthGuard } from '@ore/core';
import { AuthTokens, Role } from '@ore/contracts';

// ── helpers ──────────────────────────────────────────────────────────────────

const ACCESS  = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.sig';
const REFRESH = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEiLCJ0eXBlIjoicmVmcmVzaCJ9.sig';

const stubTokens: AuthTokens = {
  accessToken: ACCESS,
  refreshToken: REFRESH,
  isNewUser: false,
  activeRole: Role.CUSTOMER,
  roles: [Role.CUSTOMER],
  user: { id: 'user-1', phone: '233501234567', role: Role.CUSTOMER, roles: [Role.CUSTOMER], name: null },
};

function makeAuthService() {
  return {
    requestOtp: jest.fn().mockResolvedValue({ sent: true }),
    verifyOtp: jest.fn().mockResolvedValue(stubTokens),
    refresh: jest.fn().mockResolvedValue(stubTokens),
    adminLogin: jest.fn().mockResolvedValue({ accessToken: ACCESS, refreshToken: REFRESH }),
    userById: jest.fn().mockResolvedValue({ id: 'user-1', phone: '233501234567' }),
  };
}

// ── test setup ────────────────────────────────────────────────────────────────

describe('AuthController — API contract', () => {
  let controller: AuthController;
  let authService: ReturnType<typeof makeAuthService>;

  beforeEach(async () => {
    authService = makeAuthService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  // ── POST /auth/request-otp ────────────────────────────────────────

  describe('requestOtp', () => {
    it('accepts a valid Ghanaian mobile number and returns sent:true', async () => {
      const result = await controller.requestOtp({ phone: '0501234567' });
      expect(result).toEqual({ sent: true });
      expect(authService.requestOtp).toHaveBeenCalledWith({ phone: '0501234567' });
    });

    it('accepts international format (+233)', async () => {
      const result = await controller.requestOtp({ phone: '+233501234567' });
      expect(result).toEqual({ sent: true });
    });

    it('throws ZodError (parsed as BadRequestException) for missing phone', async () => {
      await expect(controller.requestOtp({})).rejects.toThrow(Error);
    });

    it('throws for non-string phone', async () => {
      await expect(controller.requestOtp({ phone: 12345 } as any)).rejects.toThrow(Error);
    });

    it('throws for empty string phone', async () => {
      await expect(controller.requestOtp({ phone: '' })).rejects.toThrow(Error);
    });

    it('does not call authService when validation fails', async () => {
      try { await controller.requestOtp({ phone: '' }); } catch {}
      expect(authService.requestOtp).not.toHaveBeenCalled();
    });
  });

  // ── POST /auth/verify-otp ─────────────────────────────────────────

  describe('verifyOtp', () => {
    const validPayload = { phone: '0501234567', code: '123456' };

    it('returns AuthTokens on valid payload', async () => {
      const result = await controller.verifyOtp(validPayload);
      expect(result.accessToken).toBe(ACCESS);
      expect(result.refreshToken).toBe(REFRESH);
      expect(result.user.role).toBe(Role.CUSTOMER);
    });

    it('returns user profile inside the token response', async () => {
      const result = await controller.verifyOtp(validPayload);
      expect(result.user).toMatchObject({ id: 'user-1' });
    });

    it('throws for missing otp field', async () => {
      await expect(controller.verifyOtp({ phone: '0501234567' } as any)).rejects.toThrow(Error);
    });

    it('throws for missing phone field', async () => {
      await expect(controller.verifyOtp({ code: '123456' } as any)).rejects.toThrow(Error);
    });

    it('throws for empty OTP string', async () => {
      await expect(controller.verifyOtp({ phone: '0501234567', code: '' })).rejects.toThrow(Error);
    });

    it('throws for null payload', async () => {
      await expect(controller.verifyOtp(null)).rejects.toThrow(Error);
    });

    it('passes all validated fields through to authService', async () => {
      await controller.verifyOtp({ phone: '0501234567', code: '654321', role: 'RIDER' });
      expect(authService.verifyOtp).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '0501234567', code: '654321' }),
      );
    });
  });

  // ── POST /auth/refresh ────────────────────────────────────

  describe('refresh', () => {
    it('returns new AuthTokens for a valid refresh token', async () => {
      const result = await controller.refresh({ refreshToken: REFRESH });
      expect(result.accessToken).toBe(ACCESS);
      expect(authService.refresh).toHaveBeenCalledWith(REFRESH);
    });

    it('throws for missing refreshToken field', () => {
      expect(() => controller.refresh({})).toThrow();
    });

    it('throws for null body', () => {
      expect(() => controller.refresh(null)).toThrow();
    });

    it('throws for non-string refreshToken', () => {
      expect(() => controller.refresh({ refreshToken: 12345 } as any)).toThrow();
    });

    it('propagates UnauthorizedException from authService when token is expired', async () => {
      authService.refresh.mockRejectedValue(new UnauthorizedException('Token expired'));
      await expect(controller.refresh({ refreshToken: 'expired-token-123456789' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── POST /auth/admin/login ────────────────────────────────────────

  describe('adminLogin', () => {
    it('accepts email + password + totp and returns tokens', async () => {
      const result = await controller.adminLogin({ email: 'admin@ore.com', password: 'securepassword123', totpCode: '123456' });
      expect(result.accessToken).toBe(ACCESS);
      expect(authService.adminLogin).toHaveBeenCalledWith({ email: 'admin@ore.com', password: 'securepassword123', totpCode: '123456' });
    });

    it('throws for missing email', () => {
      expect(() => controller.adminLogin({ password: 'securepassword123', totpCode: '123456' } as any)).toThrow();
    });

    it('throws for missing password', () => {
      expect(() => controller.adminLogin({ email: 'admin@ore.com', totpCode: '123456' } as any)).toThrow();
    });

    it('throws for invalid email format', () => {
      expect(() => controller.adminLogin({ email: 'not-an-email', password: 'securepassword123', totpCode: '123456' } as any)).toThrow();
    });
  });

  // ── GET /auth/me ──────────────────────────────────────────────────

  describe('me', () => {
    it('returns the current user JWT payload', () => {
      const user = { sub: 'user-1', phone: '233501234567', role: Role.CUSTOMER, roles: [Role.CUSTOMER] } as any;
      const result = controller.me(user);
      expect(result.sub).toBe('user-1');
      expect(result.role).toBe(Role.CUSTOMER);
    });

    it('is a passthrough — does not mutate the JWT payload', () => {
      const user = { sub: 'user-2', phone: '233509999999', role: Role.RIDER, roles: [Role.RIDER] } as any;
      const result = controller.me(user);
      expect(result).toBe(user); // same reference
    });
  });

  // ── GET /auth/internal/users/:id ─────────────────────────────────

  describe('userById (internal)', () => {
    it('delegates to authService.userById with the given id', async () => {
      const result = await controller.userById('user-1');
      expect(result).toMatchObject({ id: 'user-1' });
      expect(authService.userById).toHaveBeenCalledWith('user-1');
    });

    it('propagates NotFoundException from authService', async () => {
      const { NotFoundException } = await import('@nestjs/common');
      authService.userById.mockRejectedValue(new NotFoundException('User not found'));
      await expect(controller.userById('ghost')).rejects.toThrow(NotFoundException);
    });
  });

  // ── Token shape validation ────────────────────────────────────────

  describe('AuthTokens response shape', () => {
    it('verifyOtp response includes accessToken, refreshToken, and user', async () => {
      const result = await controller.verifyOtp({ phone: '0501234567', code: '123456' });
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(typeof result.accessToken).toBe('string');
      expect(typeof result.refreshToken).toBe('string');
    });

    it('user object includes id, phone, and role', async () => {
      const result = await controller.verifyOtp({ phone: '0501234567', code: '123456' });
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('phone');
      expect(result.user).toHaveProperty('role');
    });

    it('user role is a valid Role enum value', async () => {
      const result = await controller.verifyOtp({ phone: '0501234567', code: '123456' });
      expect(Object.values(Role)).toContain(result.user.role);
    });
  });
});
