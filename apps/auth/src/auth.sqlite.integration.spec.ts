jest.setTimeout(30000);
/**
 * Auth service — true SQLite integration tests.
 * Uses an in-memory better-sqlite3 database (no external services needed).
 * Verifies that OTP creation, consumption, and idempotency work correctly
 * against real TypeORM queries.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TypeOrmSQLITETestingModule, clearTestDatabase } from '@ore/testing';
import { User } from './entities/user.entity';
import { OtpCode } from './entities/otp.entity';
import { IdCounter } from './entities/id-counter.entity';
import { Role } from '@ore/contracts';

describe('Auth SQLite Integration', () => {
  let module: TestingModule;
  let userRepo: Repository<User>;
  let otpRepo: Repository<OtpCode>;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [...TypeOrmSQLITETestingModule([User, OtpCode, IdCounter])],
    }).compile();

    userRepo = module.get(getRepositoryToken(User));
    otpRepo = module.get(getRepositoryToken(OtpCode));
  });

  afterAll(async () => {
    await module.close();
  });

  afterEach(async () => {
    await clearTestDatabase(module);
  });

  // ── User persistence ──────────────────────────────────────────────

  describe('User entity', () => {
    it('persists a new user with defaults', async () => {
      const user = userRepo.create({
        phone: '233501234567',
        role: Role.CUSTOMER,
        roles: [Role.CUSTOMER],
        verified: false,
      });
      await userRepo.save(user);

      const found = await userRepo.findOne({ where: { phone: '233501234567' } });
      expect(found).not.toBeNull();
      expect(found!.role).toBe(Role.CUSTOMER);
      expect(found!.verified).toBe(false);
      expect(found!.id).toMatch(/^[0-9a-f-]{36}$/); // uuid
    });

    it('enforces phone uniqueness', async () => {
      await userRepo.save(userRepo.create({ phone: '233501111111', role: Role.CUSTOMER, roles: [Role.CUSTOMER] }));
      const duplicate = userRepo.create({ phone: '233501111111', role: Role.CUSTOMER, roles: [Role.CUSTOMER] });
      await expect(userRepo.save(duplicate)).rejects.toThrow();
    });

    it('stores and retrieves multiple roles via simple-array', async () => {
      const user = userRepo.create({
        phone: '233502222222',
        role: Role.CUSTOMER,
        roles: [Role.CUSTOMER, Role.RIDER],
      });
      await userRepo.save(user);

      const found = await userRepo.findOne({ where: { phone: '233502222222' } });
      expect(found!.roles).toContain(Role.CUSTOMER);
      expect(found!.roles).toContain(Role.RIDER);
    });

    it('marks user as verified on update', async () => {
      const user = await userRepo.save(
        userRepo.create({ phone: '233503333333', role: Role.CUSTOMER, roles: [Role.CUSTOMER], verified: false }),
      );

      user.verified = true;
      user.publicId = 'ORC-2026-000001';
      await userRepo.save(user);

      const updated = await userRepo.findOne({ where: { id: user.id } });
      expect(updated!.verified).toBe(true);
      expect(updated!.publicId).toBe('ORC-2026-000001');
    });

    it('allows nullable fields to be null', async () => {
      const user = await userRepo.save(
        userRepo.create({ phone: '233504444444', role: Role.CUSTOMER, roles: [Role.CUSTOMER] }),
      );

      expect(user.name).toBeNull();
      expect(user.email).toBeNull();
      expect(user.passwordHash).toBeNull();
      expect(user.totpSecret).toBeNull();
      expect(user.deviceToken).toBeNull();
    });
  });

  // ── OTP persistence ───────────────────────────────────────────────

  describe('OtpCode entity', () => {
    it('persists an OTP code', async () => {
      const otp = otpRepo.create({
        phone: '233501234567',
        codeHash: 'sha256-hash-of-123456',
        expiresAt: new Date(Date.now() + 5 * 60_000),
        attempts: 0,
        consumed: false,
      });
      await otpRepo.save(otp);

      const found = await otpRepo.findOne({ where: { phone: '233501234567' } });
      expect(found).not.toBeNull();
      expect(found!.consumed).toBe(false);
      expect(found!.attempts).toBe(0);
    });

    it('increments attempts correctly', async () => {
      const otp = await otpRepo.save(
        otpRepo.create({
          phone: '233505555555',
          codeHash: 'hash',
          expiresAt: new Date(Date.now() + 5 * 60_000),
        }),
      );

      otp.attempts += 1;
      await otpRepo.save(otp);
      otp.attempts += 1;
      await otpRepo.save(otp);

      const updated = await otpRepo.findOne({ where: { id: otp.id } });
      expect(updated!.attempts).toBe(2);
    });

    it('marks OTP as consumed', async () => {
      const otp = await otpRepo.save(
        otpRepo.create({
          phone: '233506666666',
          codeHash: 'hash',
          expiresAt: new Date(Date.now() + 5 * 60_000),
          consumed: false,
        }),
      );

      otp.consumed = true;
      await otpRepo.save(otp);

      const updated = await otpRepo.findOne({ where: { id: otp.id } });
      expect(updated!.consumed).toBe(true);
    });

    it('allows multiple OTPs for the same phone (rate limiting handled at service layer)', async () => {
      for (let i = 0; i < 3; i++) {
        await otpRepo.save(
          otpRepo.create({
            phone: '233507777777',
            codeHash: `hash-${i}`,
            expiresAt: new Date(Date.now() + 5 * 60_000),
          }),
        );
      }

      const all = await otpRepo.find({ where: { phone: '233507777777' } });
      expect(all).toHaveLength(3);
    });

    it('finds the most recent unconsumed OTP for a phone', async () => {
      const old = await otpRepo.save(
        otpRepo.create({ phone: '233508888888', codeHash: 'hash-old', expiresAt: new Date(Date.now() + 60_000), consumed: false }),
      );
      // Wait 10ms to ensure createdAt differs
      await new Promise(r => setTimeout(r, 10));
      const fresh = await otpRepo.save(
        otpRepo.create({ phone: '233508888888', codeHash: 'hash-fresh', expiresAt: new Date(Date.now() + 5 * 60_000), consumed: false }),
      );

      const found = await otpRepo.findOne({
        where: { phone: '233508888888', consumed: false },
        order: { createdAt: 'DESC', id: 'DESC' },
      });

      expect(found!.codeHash).toBe('hash-fresh');
    });
  });

  // ── clearTestDatabase ─────────────────────────────────────────────

  describe('clearTestDatabase utility', () => {
    it('removes all records between tests', async () => {
      await userRepo.save(userRepo.create({ phone: '233509999999', role: Role.CUSTOMER, roles: [Role.CUSTOMER] }));
      expect(await userRepo.count()).toBe(1);

      await clearTestDatabase(module);

      expect(await userRepo.count()).toBe(0);
    });
  });
});
