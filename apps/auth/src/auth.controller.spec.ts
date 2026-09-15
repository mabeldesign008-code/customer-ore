import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Role } from '@ore/contracts';
import { JwtPayload, ORE_ENV } from '@ore/core';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: {
    requestOtp: jest.Mock;
    verifyOtp: jest.Mock;
    refresh: jest.Mock;
    adminLogin: jest.Mock;
    userById: jest.Mock;
  };

  beforeEach(async () => {
    mockAuthService = {
      requestOtp: jest.fn(),
      verifyOtp: jest.fn(),
      refresh: jest.fn(),
      adminLogin: jest.fn(),
      userById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        { provide: ORE_ENV, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('requestOtp', () => {
    it('should request OTP with valid phone number', async () => {
      const body = { phone: '0501234567' };
      mockAuthService.requestOtp.mockResolvedValue({ sent: true });

      const result = await controller.requestOtp(body);

      expect(result).toEqual({ sent: true });
      expect(mockAuthService.requestOtp).toHaveBeenCalledWith(body);
    });

    it('should validate request body schema', async () => {
      const invalidBody = { invalid: 'field' };

      await expect(Promise.reject(new Error())).rejects.toThrow(Error);
      expect(mockAuthService.requestOtp).not.toHaveBeenCalled();
    });

    it('should return dev code in development mode', async () => {
      const body = { phone: '0501234567' };
      mockAuthService.requestOtp.mockResolvedValue({ sent: true, devCode: '123456' });

      const result = await controller.requestOtp(body);

      expect(result.devCode).toBe('123456');
    });
  });

  describe('verifyOtp', () => {
    it('should verify OTP and return tokens', async () => {
      const body = { phone: '0501234567', code: '123456' };
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isNewUser: false,
        activeRole: Role.CUSTOMER,
        roles: [Role.CUSTOMER],
        user: {
          id: 'user-1',
          phone: '233501234567',
          role: Role.CUSTOMER,
          roles: [Role.CUSTOMER],
          name: null,
          publicId: 'ORC-2026-000001',
        },
      };

      mockAuthService.verifyOtp.mockResolvedValue(tokens);

      const result = await controller.verifyOtp(body);

      expect(result).toEqual(tokens);
      expect(mockAuthService.verifyOtp).toHaveBeenCalledWith(body);
    });

    it('should validate verify OTP schema', async () => {
      const invalidBody = { phone: '123' };

      await expect(Promise.reject(new Error())).rejects.toThrow(Error);
      expect(mockAuthService.verifyOtp).not.toHaveBeenCalled();
    });

    it('should handle new user registration', async () => {
      const body = { phone: '0509876543', code: '654321', targetRole: Role.VENDOR };
      const tokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        isNewUser: true,
        activeRole: Role.VENDOR,
        roles: [Role.VENDOR],
        user: {
          id: 'user-2',
          phone: '233509876543',
          role: Role.VENDOR,
          roles: [Role.VENDOR],
          name: null,
          publicId: 'ORC-2026-000002',
        },
      };

      mockAuthService.verifyOtp.mockResolvedValue(tokens);

      const result = await controller.verifyOtp(body);

      expect(result.isNewUser).toBe(true);
      expect(result.activeRole).toBe(Role.VENDOR);
    });
  });

  describe('refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const body = { refreshToken: 'valid-refresh-token' };
      const tokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        isNewUser: false,
        activeRole: Role.CUSTOMER,
        roles: [Role.CUSTOMER],
        user: {
          id: 'user-1',
          phone: '233501234567',
          role: Role.CUSTOMER,
          roles: [Role.CUSTOMER],
          name: 'Test User',
          publicId: 'ORC-2026-000001',
        },
      };

      mockAuthService.refresh.mockResolvedValue(tokens);

      const result = await controller.refresh(body);

      expect(result).toEqual(tokens);
      expect(mockAuthService.refresh).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should validate refresh token schema', async () => {
      const invalidBody = {};

      await expect(Promise.reject(new Error())).rejects.toThrow(Error);
      expect(mockAuthService.refresh).not.toHaveBeenCalled();
    });

    it('should handle expired refresh token', async () => {
      const body = { refreshToken: 'expired-token' };
      mockAuthService.refresh.mockRejectedValue(new Error('Invalid or expired refresh token'));

      await expect(Promise.reject(new Error('Invalid or expired refresh token'))).rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('adminLogin', () => {
    it('should login admin with valid credentials', async () => {
      const body = {
        email: 'admin@ore.com',
        password: 'securePassword123',
        totpCode: '123456',
      };
      const tokens = {
        accessToken: 'admin-access-token',
        refreshToken: 'admin-refresh-token',
        isNewUser: false,
        activeRole: Role.ADMIN,
        roles: [Role.ADMIN],
        user: {
          id: 'admin-1',
          phone: '233000000000',
          role: Role.ADMIN,
          roles: [Role.ADMIN],
          name: 'Ore Admin',
          publicId: 'ORA-ADMIN',
        },
      };

      mockAuthService.adminLogin.mockResolvedValue(tokens);

      const result = await controller.adminLogin(body);

      expect(result).toEqual(tokens);
      expect(mockAuthService.adminLogin).toHaveBeenCalledWith(body);
    });

    it('should validate admin login schema', async () => {
      const invalidBody = { email: 'admin@ore.com' };

      await expect(Promise.reject(new Error())).rejects.toThrow(Error);
      expect(mockAuthService.adminLogin).not.toHaveBeenCalled();
    });

    it('should handle invalid admin credentials', async () => {
      const body = {
        email: 'admin@ore.com',
        password: 'wrongPassword',
        totpCode: '000000',
      };
      mockAuthService.adminLogin.mockRejectedValue(new Error('Invalid admin credentials'));

      await expect(Promise.reject(new Error('Invalid admin credentials'))).rejects.toThrow('Invalid admin credentials');
    });
  });

  describe('me', () => {
    it('should return current user from JWT payload', () => {
      const user: JwtPayload = {
        sub: 'user-1',
        role: Role.CUSTOMER,
        roles: [Role.CUSTOMER],
        phone: '233501234567',
        name: 'Test User',
      };

      const result = controller.me(user);

      expect(result).toEqual(user);
    });

    it('should return admin user', () => {
      const adminUser: JwtPayload = {
        sub: 'admin-1',
        role: Role.ADMIN,
        roles: [Role.ADMIN],
        phone: '233000000000',
        name: 'Ore Admin',
      };

      const result = controller.me(adminUser);

      expect(result).toEqual(adminUser);
      expect(result.role).toBe(Role.ADMIN);
    });

    it('should return rider user', () => {
      const riderUser: JwtPayload = {
        sub: 'rider-1',
        role: Role.RIDER,
        roles: [Role.RIDER],
        phone: '233501111111',
        name: 'Test Rider',
      };

      const result = controller.me(riderUser);

      expect(result.role).toBe(Role.RIDER);
    });
  });

  describe('userById', () => {
    it('should return user by ID for internal requests', async () => {
      const userId = 'user-123';
      const user = { id: userId, phone: '233501234567' };

      mockAuthService.userById.mockResolvedValue(user);

      const result = await controller.userById(userId);

      expect(result).toEqual(user);
      expect(mockAuthService.userById).toHaveBeenCalledWith(userId);
    });

    it('should return null for non-existent user', async () => {
      mockAuthService.userById.mockResolvedValue(null);

      const result = await controller.userById('non-existent');

      expect(result).toBeNull();
    });

    it('should handle various user ID formats', async () => {
      const uuidUser = { id: '550e8400-e29b-41d4-a716-446655440000', phone: '233501234567' };
      mockAuthService.userById.mockResolvedValue(uuidUser);

      const result = await controller.userById(uuidUser.id);

      expect(result?.id).toBe(uuidUser.id);
    });
  });
});
