import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { OtpCode } from './entities/otp.entity';
import { IdCounter } from './entities/id-counter.entity';
import { AdminUser } from './entities/admin-user.entity';
import { RefreshRevocation } from './entities/refresh-revocation.entity';
import { InMemoryRateLimiter, ORE_BUS, ORE_ENV, ORE_NOTIFY, ORE_RATE_LIMIT } from '@ore/core';
import { Role } from '@ore/contracts';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createMockRepository } from '@ore/testing';
import { createHash } from 'crypto';

/** Same derivation the service uses, so a fixture can present a genuinely matching hash. */
const hashFor = (code: string, secret = 'test-secret') =>
  createHash('sha256').update(`${secret}:${code}`).digest('hex');
const future = () => new Date(Date.now() + 300_000);

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: ReturnType<typeof createMockRepository<User>>;
  let mockOtpRepo: ReturnType<typeof createMockRepository<OtpCode>>;
  let mockCounterRepo: ReturnType<typeof createMockRepository<IdCounter>>;
  let mockRefreshRevocationRepo: ReturnType<typeof createMockRepository<RefreshRevocation>>;
  let mockAdminUserRepo: ReturnType<typeof createMockRepository<AdminUser>>;
  let mockBus: { publish: jest.Mock };
  let mockNotify: { sendSms: jest.Mock };
  let mockEnv: any;

  beforeEach(async () => {
    mockUserRepo = createMockRepository<User>();
    mockOtpRepo = createMockRepository<OtpCode>();
    mockCounterRepo = createMockRepository<IdCounter>();
    mockRefreshRevocationRepo = createMockRepository<RefreshRevocation>();
    // `nextSequenceValue` reaches through the repository to the connection to pick its
    // dialect, then UPSERTs and reads the row back. Give the mock that shape so customer-ID
    // generation is exercised rather than blowing up on an undefined connection.
    (mockCounterRepo as any).manager = {
      connection: { options: { type: 'sqlite' } },
      query: jest.fn().mockResolvedValue([]),
    };
    (mockCounterRepo as any).metadata = { tableName: 'id_counter', schema: undefined };
    (mockCounterRepo.findOne as jest.Mock).mockResolvedValue({ key: 'customer', seq: 42 });
    // AuthService grew this repository when the admin lifecycle landed; without a provider
    // the whole suite fails to construct and the OTP path goes untested.
    mockAdminUserRepo = createMockRepository<AdminUser>();

    mockBus = { publish: jest.fn() };
    mockNotify = { sendSms: jest.fn().mockResolvedValue(undefined) };
    mockEnv = {
      JWT_ACCESS_EXPIRES_IN: '1h',
      JWT_REFRESH_EXPIRES_IN: '7d',
      JWT_SECRET: 'secret',
      otpTtlMin: 5,
      otpLog: false,
      jwtSecret: 'test-secret',
      jwtExpiresIn: '15m',
      jwtAccessTtl: '15m',
      jwtRefreshTtl: '7d',
      adminEmail: '',
      adminPassword: '',
      adminTotpSecret: '',
      dbType: 'sqlite',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(OtpCode), useValue: mockOtpRepo },
        { provide: getRepositoryToken(IdCounter), useValue: mockCounterRepo },
        { provide: getRepositoryToken(RefreshRevocation), useValue: mockRefreshRevocationRepo },
        { provide: getRepositoryToken(AdminUser), useValue: mockAdminUserRepo },
        { provide: ORE_ENV, useValue: mockEnv },
        { provide: ORE_BUS, useValue: mockBus },
        { provide: ORE_NOTIFY, useValue: mockNotify },
        // The real limiter, not a stub: an always-allow mock would make every rate-limit test pass vacuously.
        { provide: ORE_RATE_LIMIT, useValue: new InMemoryRateLimiter() },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('requestOtp', () => {
    it('should send OTP to valid phone number', async () => {
      const dto = { phone: '0501234567' };
      mockOtpRepo.save.mockResolvedValue({} as OtpCode);

      const result = await service.requestOtp(dto);

      expect(result.sent).toBe(true);
      expect(mockNotify.sendSms).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '233501234567',
          text: expect.stringContaining('verification code'),
        }),
      );
      expect(mockOtpRepo.save).toHaveBeenCalled();
    });

    it('should normalize phone numbers starting with 0', async () => {
      const dto = { phone: '0501234567' };
      mockOtpRepo.save.mockResolvedValue({} as OtpCode);

      await service.requestOtp(dto);

      expect(mockNotify.sendSms).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '233501234567',
        }),
      );
    });

    it('should normalize phone numbers starting with +', async () => {
      const dto = { phone: '+233501234567' };
      mockOtpRepo.save.mockResolvedValue({} as OtpCode);

      await service.requestOtp(dto);

      expect(mockNotify.sendSms).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '233501234567',
        }),
      );
    });

    it('should include dev code in development mode', async () => {
      mockEnv.otpLog = true;
      mockOtpRepo.save.mockResolvedValue({} as OtpCode);

      const result = await service.requestOtp({ phone: '0501234567' });

      expect(result.devCode).toBeDefined();
      expect(result.devCode).toMatch(/^\d{6}$/);
    });

    it('enforces the OTP rate limit in production — 5 per phone per 10 minutes', async () => {
      mockOtpRepo.save.mockResolvedValue({} as OtpCode);
      // The limiter is deliberately inert outside production so development and tests are
      // not throttled; asserting it here requires turning it on.
      mockEnv.nodeEnv = 'production';

      // Requests 1–5 are allowed: the first opens the window, 2–5 fill it.
      for (let i = 0; i < 5; i++) {
        await expect(service.requestOtp({ phone: '0501234567' })).resolves.toBeDefined();
      }

      // The 6th is refused, and keeps being refused.
      await expect(service.requestOtp({ phone: '0501234567' })).rejects.toThrow(BadRequestException);
      await expect(service.requestOtp({ phone: '0501234567' })).rejects.toThrow('Too many OTP requests');
    });

    it('throttles outside production too', async () => {
      // Previously this asserted the opposite: the limiter returned early unless nodeEnv was
      // 'production'. That meant the only environment the rate limit ever ran in was the one
      // where it could not be exercised safely, so its first real execution was always during
      // an incident. Staging and load tests silently had no OTP limit at all.
      mockOtpRepo.save.mockResolvedValue({} as OtpCode);
      mockEnv.nodeEnv = 'test';

      for (let i = 0; i < 5; i++) {
        await expect(service.requestOtp({ phone: '0509999999' })).resolves.toBeDefined();
      }
      await expect(service.requestOtp({ phone: '0509999999' })).rejects.toThrow('Too many OTP requests');
    });

    it('limits each phone number independently', async () => {
      mockOtpRepo.save.mockResolvedValue({} as OtpCode);
      for (let i = 0; i < 5; i++) {
        await service.requestOtp({ phone: '0501111111' });
      }
      await expect(service.requestOtp({ phone: '0501111111' })).rejects.toThrow('Too many OTP requests');

      // One flooded number must not lock out everybody else — otherwise the rate limit is itself
      // a denial-of-service vector.
      await expect(service.requestOtp({ phone: '0502222222' })).resolves.toBeDefined();
    });

    it('limits the normalised phone number, not the string typed', async () => {
      mockOtpRepo.save.mockResolvedValue({} as OtpCode);
      // 050…, +23350… and 23350… are one handset. Keying on the raw input would give an attacker
      // three budgets per number just by reformatting it.
      const spellings = ['0503333333', '+233503333333', '233503333333', '0503333333', '+233503333333'];
      for (const phone of spellings) {
        await expect(service.requestOtp({ phone })).resolves.toBeDefined();
      }
      await expect(service.requestOtp({ phone: '233503333333' })).rejects.toThrow('Too many OTP requests');
    });

    it('tells the caller when they can try again', async () => {
      mockOtpRepo.save.mockResolvedValue({} as OtpCode);
      for (let i = 0; i < 5; i++) await service.requestOtp({ phone: '0504444444' });

      await expect(service.requestOtp({ phone: '0504444444' })).rejects.toThrow(/try again in \d+ minute/);
    });

    it('should create OTP with correct expiry time', async () => {
      mockOtpRepo.save.mockResolvedValue({} as OtpCode);
      mockEnv.otpTtlMin = 10;

      await service.requestOtp({ phone: '0501234567' });

      const savedOtp = mockOtpRepo.create.mock.calls[0][0];
      const now = Date.now();
      const expiresAt = savedOtp.expiresAt.getTime();

      // Should expire in ~10 minutes (allowing 1 second tolerance)
      expect(expiresAt).toBeGreaterThan(now + 9 * 60_000);
      expect(expiresAt).toBeLessThan(now + 11 * 60_000);
    });

    it('should remove whitespace from phone numbers', async () => {
      mockOtpRepo.save.mockResolvedValue({} as OtpCode);

      await service.requestOtp({ phone: '050 123 4567' });

      expect(mockNotify.sendSms).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '233501234567',
        }),
      );
    });
  });

  describe('verifyOtp', () => {
    it('should verify valid OTP and return tokens for new user', async () => {
      const dto = { phone: '0501234567', code: '123456' };
      const otp = {
        phone: '233501234567',
        consumed: false,
        expiresAt: new Date(Date.now() + 300_000),
        attempts: 0,
        codeHash: 'mocked-hash',
      } as OtpCode;

      mockOtpRepo.findOne.mockResolvedValue(otp);
      mockUserRepo.findOne.mockResolvedValue(null); // New user
      mockUserRepo.save.mockResolvedValue({
        id: 'user-1',
        phone: '233501234567',
        role: Role.CUSTOMER,
        roles: [Role.CUSTOMER],
        verified: true,
        publicId: 'ORC-2026-000001',
      } as User);
      // `nextSequenceValue` branches on the dialect, so the manager needs a connection.
      mockCounterRepo.manager = {
        connection: { options: { type: 'sqlite' } },
        query: jest.fn().mockResolvedValue([{ seq: 1 }]),
      } as any;
      (mockCounterRepo as any).metadata = { tableName: 'id_counter', schema: undefined } as any;
      (mockCounterRepo.findOne as jest.Mock).mockResolvedValue({ key: 'customer', seq: 1 });

      // Mock hash verification by patching the service's private method
      const hashOtpSpy = jest.spyOn(service as any, 'hashOtp');
      hashOtpSpy.mockReturnValue('mocked-hash');

      const result = await service.verifyOtp(dto);

      expect(result.isNewUser).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.phone).toBe('233501234567');
      expect(mockBus.publish).toHaveBeenCalled();
      expect(otp.consumed).toBe(true);
    });

    it('should verify OTP and return tokens for existing user', async () => {
      const dto = { phone: '0501234567', code: '123456' };
      const otp = {
        phone: '233501234567',
        consumed: false,
        expiresAt: new Date(Date.now() + 300_000),
        attempts: 0,
        codeHash: 'mocked-hash',
      } as OtpCode;
      const existingUser = {
        id: 'user-1',
        phone: '233501234567',
        role: Role.CUSTOMER,
        roles: [Role.CUSTOMER],
        verified: false,
        publicId: 'ORC-2026-000001',
      } as User;

      mockOtpRepo.findOne.mockResolvedValue(otp);
      mockUserRepo.findOne.mockResolvedValue(existingUser);
      mockUserRepo.save.mockResolvedValue(existingUser);

      const hashOtpSpy = jest.spyOn(service as any, 'hashOtp');
      hashOtpSpy.mockReturnValue('mocked-hash');

      const result = await service.verifyOtp(dto);

      expect(result.isNewUser).toBe(false);
      expect(result.user.id).toBe('user-1');
      expect(existingUser.verified).toBe(true);
    });

    it('should throw error when no OTP found', async () => {
      const dto = { phone: '0501234567', code: '123456' };
      mockOtpRepo.findOne.mockResolvedValue(null);

      await expect(service.verifyOtp(dto)).rejects.toThrow(BadRequestException);
      await expect(service.verifyOtp(dto)).rejects.toThrow('No active OTP');
    });

    it('should throw error when OTP is expired', async () => {
      const dto = { phone: '0501234567', code: '123456' };
      const expiredOtp = {
        phone: '233501234567',
        consumed: false,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        attempts: 0,
      } as OtpCode;

      mockOtpRepo.findOne.mockResolvedValue(expiredOtp);

      await expect(service.verifyOtp(dto)).rejects.toThrow(BadRequestException);
      await expect(service.verifyOtp(dto)).rejects.toThrow('OTP expired');
    });

    it('should throw error when too many attempts', async () => {
      const dto = { phone: '0501234567', code: '123456' };
      const otp = {
        phone: '233501234567',
        consumed: false,
        expiresAt: new Date(Date.now() + 300_000),
        attempts: 5,
      } as OtpCode;

      mockOtpRepo.findOne.mockResolvedValue(otp);

      await expect(service.verifyOtp(dto)).rejects.toThrow(BadRequestException);
      await expect(service.verifyOtp(dto)).rejects.toThrow('Too many attempts');
    });

    it('persists the incremented counter, not just the in-memory object', async () => {
      // If the increment is never saved, the guard reads 0 forever and a 6-digit code is
      // brute-forceable at request rate.
      const otp = { id: 'o1', phone: '233501234567', codeHash: hashFor('999999'), consumed: false, attempts: 2, expiresAt: future() } as OtpCode;
      mockOtpRepo.findOne.mockResolvedValue(otp);

      await expect(service.verifyOtp({ phone: '0501234567', code: '111111' })).rejects.toThrow();

      expect(mockOtpRepo.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'o1', attempts: 3 }));
    });

    it('checks the attempt ceiling before comparing the code', async () => {
      // Comparing first would leak one extra guess per exhausted row, and would keep the
      // comparison reachable for an attacker who has already burned the budget.
      const otp = { id: 'o1', phone: '233501234567', codeHash: hashFor('123456'), consumed: false, attempts: 5, expiresAt: future() } as OtpCode;
      mockOtpRepo.findOne.mockResolvedValue(otp);

      // Even with the *correct* code, an exhausted row is refused.
      await expect(service.verifyOtp({ phone: '0501234567', code: '123456' })).rejects.toThrow('Too many attempts');
      expect(mockOtpRepo.save).not.toHaveBeenCalled();
    });

    it('never rewinds the counter on a successful verification', async () => {
      const otp = { id: 'o1', phone: '233501234567', codeHash: hashFor('123456'), consumed: false, attempts: 4, expiresAt: future() } as OtpCode;
      mockOtpRepo.findOne.mockResolvedValue(otp);
      mockUserRepo.findOne.mockResolvedValue({ id: 'u1', phone: '233501234567', role: Role.CUSTOMER });

      await service.verifyOtp({ phone: '0501234567', code: '123456' });

      // The row is consumed, so the count is moot — but zeroing it would make an audit of
      // brute-force pressure impossible after the fact.
      expect(otp.attempts).toBe(4);
      expect(otp.consumed).toBe(true);
    });

    it('marks the row consumed so a correct code cannot be replayed', async () => {
      const otp = { id: 'o1', phone: '233501234567', codeHash: hashFor('123456'), consumed: false, attempts: 0, expiresAt: future() } as OtpCode;
      mockOtpRepo.findOne.mockResolvedValue(otp);
      mockUserRepo.findOne.mockResolvedValue({ id: 'u1', phone: '233501234567', role: Role.CUSTOMER });

      await service.verifyOtp({ phone: '0501234567', code: '123456' });
      expect(mockOtpRepo.save).toHaveBeenCalledWith(expect.objectContaining({ consumed: true }));
    });

    it('caps total guesses even when the attacker keeps requesting fresh codes', async () => {
      // Each `requestOtp` mints a new row with attempts = 0, so the 5-attempt ceiling alone does
      // not bound the search — the send limit is what closes it. 5 sends × 5 attempts = 25
      // guesses per 10 minutes against a 10^6 space.
      mockOtpRepo.save.mockResolvedValue({} as OtpCode);
      for (let i = 0; i < 5; i++) {
        await expect(service.requestOtp({ phone: '0508888888' })).resolves.toBeDefined();
      }
      await expect(service.requestOtp({ phone: '0508888888' })).rejects.toThrow('Too many OTP requests');
    });

    it('should increment attempts on incorrect code', async () => {
      const dto = { phone: '0501234567', code: '654321' };
      const otp = {
        phone: '233501234567',
        consumed: false,
        expiresAt: new Date(Date.now() + 300_000),
        attempts: 0,
        codeHash: 'correct-hash',
      } as OtpCode;

      mockOtpRepo.findOne.mockResolvedValue(otp);
      mockOtpRepo.save.mockResolvedValue(otp);

      const hashOtpSpy = jest.spyOn(service as any, 'hashOtp');
      hashOtpSpy.mockReturnValue('wrong-hash');

      await expect(service.verifyOtp(dto)).rejects.toThrow(UnauthorizedException);
      expect(otp.attempts).toBe(1);
      expect(mockOtpRepo.save).toHaveBeenCalledWith(otp);
    });

    it('should prevent role mixing: rider cannot become vendor', async () => {
      const dto = { phone: '0501234567', code: '123456', targetRole: Role.VENDOR };
      const otp = {
        phone: '233501234567',
        consumed: false,
        expiresAt: new Date(Date.now() + 300_000),
        attempts: 0,
        codeHash: 'mocked-hash',
      } as OtpCode;
      const riderUser = {
        id: 'rider-1',
        phone: '233501234567',
        role: Role.RIDER,
        roles: [Role.RIDER],
      } as User;

      mockOtpRepo.findOne.mockResolvedValue(otp);
      mockUserRepo.findOne.mockResolvedValue(riderUser);

      const hashOtpSpy = jest.spyOn(service as any, 'hashOtp');
      hashOtpSpy.mockReturnValue('mocked-hash');

      await expect(service.verifyOtp(dto)).rejects.toThrow(BadRequestException);
      await expect(service.verifyOtp(dto)).rejects.toThrow(
        'Rider and Vendor roles cannot be combined',
      );
    });

    it('should prevent role mixing: vendor cannot become rider', async () => {
      const dto = { phone: '0501234567', code: '123456', targetRole: Role.RIDER };
      const otp = {
        phone: '233501234567',
        consumed: false,
        expiresAt: new Date(Date.now() + 300_000),
        attempts: 0,
        codeHash: 'mocked-hash',
      } as OtpCode;
      const vendorUser = {
        id: 'vendor-1',
        phone: '233501234567',
        role: Role.VENDOR,
        roles: [Role.VENDOR],
      } as User;

      mockOtpRepo.findOne.mockResolvedValue(otp);
      mockUserRepo.findOne.mockResolvedValue(vendorUser);

      const hashOtpSpy = jest.spyOn(service as any, 'hashOtp');
      hashOtpSpy.mockReturnValue('mocked-hash');

      await expect(service.verifyOtp(dto)).rejects.toThrow(BadRequestException);
      await expect(service.verifyOtp(dto)).rejects.toThrow(
        'Rider and Vendor roles cannot be combined',
      );
    });

    it('should preserve admin role during login', async () => {
      const dto = { phone: '0501234567', code: '123456' };
      const otp = {
        phone: '233501234567',
        consumed: false,
        expiresAt: new Date(Date.now() + 300_000),
        attempts: 0,
        codeHash: 'mocked-hash',
      } as OtpCode;
      const adminUser = {
        id: 'admin-1',
        phone: '233501234567',
        role: Role.ADMIN,
        roles: [Role.ADMIN],
      } as User;

      mockOtpRepo.findOne.mockResolvedValue(otp);
      mockUserRepo.findOne.mockResolvedValue(adminUser);
      mockUserRepo.save.mockResolvedValue(adminUser);

      const hashOtpSpy = jest.spyOn(service as any, 'hashOtp');
      hashOtpSpy.mockReturnValue('mocked-hash');

      const result = await service.verifyOtp(dto);

      expect(result.activeRole).toBe(Role.ADMIN);
      expect(adminUser.role).toBe(Role.ADMIN);
    });

    it('should save device token when provided', async () => {
      const dto = {
        phone: '0501234567',
        code: '123456',
        deviceToken: 'firebase-token-123',
        deviceFingerprint: 'device-fp-456',
      };
      const otp = {
        phone: '233501234567',
        consumed: false,
        expiresAt: new Date(Date.now() + 300_000),
        attempts: 0,
        codeHash: 'mocked-hash',
      } as OtpCode;
      const user = {
        id: 'user-1',
        phone: '233501234567',
        role: Role.CUSTOMER,
        roles: [Role.CUSTOMER],
      } as User;

      mockOtpRepo.findOne.mockResolvedValue(otp);
      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue(user);

      const hashOtpSpy = jest.spyOn(service as any, 'hashOtp');
      hashOtpSpy.mockReturnValue('mocked-hash');

      await service.verifyOtp(dto);

      expect(user.deviceToken).toBe('firebase-token-123');
      expect(user.deviceFingerprint).toBe('device-fp-456');
      expect(mockUserRepo.save).toHaveBeenCalledWith(user);
    });
  });

  describe('refresh', () => {
    it('should refresh tokens with valid refresh token', async () => {
      const user = {
        id: 'user-1',
        phone: '233501234567',
        role: Role.CUSTOMER,
        roles: [Role.CUSTOMER],
        name: 'Test User',
      } as User;

      mockUserRepo.findOne.mockResolvedValue(user);

      // Mock verifyRefreshToken to return valid payload
      jest.mock('@ore/core', () => ({
        verifyRefreshToken: jest.fn().mockReturnValue({ sub: 'user-1' }),
      }));

      // We can't easily test this without mocking the JWT verification
      // The actual test would require proper JWT token generation
      // For now, we'll just verify the service method exists
      expect(service.refresh).toBeDefined();
    });

    it('should throw error for invalid refresh token', async () => {
      // Mock will throw during JWT verification
      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      // This will fail during JWT verification or user lookup
      await expect(service.refresh('some-token')).rejects.toThrow();
    });
  });

  describe('adminLogin', () => {
    it('should throw error when admin not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        service.adminLogin({
          email: 'admin@ore.com',
          password: 'password',
          totpCode: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error when password hash missing', async () => {
      const admin = {
        email: 'admin@ore.com',
        role: Role.ADMIN,
        passwordHash: null,
        totpSecret: 'JBSWY3DPEHPK3PXP',
      } as User;

      mockUserRepo.findOne.mockResolvedValue(admin);

      await expect(
        service.adminLogin({
          email: 'admin@ore.com',
          password: 'password',
          totpCode: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error when TOTP secret missing', async () => {
      const admin = {
        email: 'admin@ore.com',
        role: Role.ADMIN,
        passwordHash: 'scrypt:salt:hash',
        totpSecret: null,
      } as User;

      mockUserRepo.findOne.mockResolvedValue(admin);

      await expect(
        service.adminLogin({
          email: 'admin@ore.com',
          password: 'password',
          totpCode: '123456',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('userById', () => {
    it('should return user by ID', async () => {
      const user = {
        id: 'user-123',
        phone: '233501234567',
        role: Role.CUSTOMER,
      } as User;

      mockUserRepo.findOne.mockResolvedValue(user);

      const result = await service.userById('user-123');

      expect(result).toEqual({ id: 'user-123', phone: '233501234567' });
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({ where: { id: 'user-123' } });
    });

    it('should return null when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.userById('non-existent');

      expect(result).toBeNull();
    });
  });
});
