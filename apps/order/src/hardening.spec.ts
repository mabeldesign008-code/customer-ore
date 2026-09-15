import { OrderService } from './order.service';
import { decryptOtp, encryptOtp, resetOtpKeyCache } from './otp-crypto';
import { OrderStatus } from '@ore/contracts';

/**
 * Regression tests for the money-integrity hardening (audit P0/P1):
 *  - OTP ciphertext is encrypted at rest and round-trips through the internal reveal.
 *  - adminForceStateTransition refuses no-op and terminal targets, so a forced
 *    DELIVERED can never be posted twice through the ledger.
 */
describe('order service hardening', () => {
  describe('OTP at rest', () => {
    // Moved off OrderService into `otp-crypto`, so the key resolution could be given a
    // fail-fast contract and tested without standing up the whole service.
    const encrypt = encryptOtp;
    const decrypt = decryptOtp;

    beforeAll(() => {
      process.env.OTP_ENC_KEY ??= 'hardening-spec-key';
      resetOtpKeyCache();
    });

    it('encrypts OTPs so the plaintext never appears in the stored payload', () => {
      const cipher = encrypt('1234');
      expect(cipher).not.toContain('1234');
      expect(cipher.split('.')).toHaveLength(3); // iv.tag.ct
      expect(decrypt(cipher)).toBe('1234');
    });

    it('produces different ciphertexts for the same OTP (random IV)', () => {
      expect(encrypt('9999')).not.toBe(encrypt('9999'));
    });

    it('rejects tampered ciphertext', () => {
      const cipher = encrypt('1234');
      const [iv, tag, ct] = cipher.split('.');
      const tampered = Buffer.from(ct, 'base64');
      tampered[0] ^= 0xff;
      expect(() => decrypt(`${iv}.${tag}.${tampered.toString('base64')}`)).toThrow();
    });
  });

  describe('adminForceStateTransition guards', () => {
    const fakeOrder = (status: OrderStatus) => ({
      id: 'ord-1',
      checkoutId: 'chk-1',
      status,
      vendorId: 'v',
      customerId: 'c',
      paymentMethod: 'PREPAID',
      totalPesewas: 1000,
      otpHash: null,
      otpCipher: null,
      errandJson: null,
      parcelJson: null,
    });

    const makeService = (order: ReturnType<typeof fakeOrder>) => {
      const save = jest.fn().mockImplementation((o) => Promise.resolve(o));
      const ordersRepo = {
        findOne: jest.fn().mockResolvedValue(order),
        findOneOrFail: jest.fn().mockResolvedValue(order),
        save,
      };
      const service = new OrderService(
        ordersRepo as never,
        { find: jest.fn().mockResolvedValue([]) } as never,
        { save: jest.fn().mockResolvedValue({}), create: jest.fn().mockReturnValue({}) } as never,
        { findOne: jest.fn().mockResolvedValue({ key: 'x', seq: 1 }) } as never,
        {} as never,
        { save: jest.fn().mockResolvedValue({}), create: jest.fn().mockImplementation((x) => x), find: jest.fn().mockResolvedValue([]) } as never,
        { publish: jest.fn().mockResolvedValue(undefined) } as never,
        { onProcess: jest.fn(), onInterval: jest.fn(), schedule: jest.fn(), cancel: jest.fn(), close: jest.fn() } as never,
        { referralMonthlyCap: 20 } as never,
        { sendPush: jest.fn(), sendSms: jest.fn() } as never,
        { putObject: jest.fn(), getObjectUrl: jest.fn(), createPresignedUpload: jest.fn(), createPresignedDownload: jest.fn(), deleteObject: jest.fn() } as never,
      );
      return { service, save };
    };

    it('refuses to force a transition on an order that is already terminal', async () => {
      const order = fakeOrder(OrderStatus.DELIVERED);
      const { service, save } = makeService(order);
      await expect(service.adminForceStateTransition('ord-1', OrderStatus.DELIVERED, 'again', 'admin-1')).rejects.toThrow();
      expect(save).not.toHaveBeenCalled();
    });

    it('refuses a no-op force (same status)', async () => {
      const order = fakeOrder(OrderStatus.READY_FOR_PICKUP);
      const { service, save } = makeService(order);
      await expect(service.adminForceStateTransition('ord-1', OrderStatus.READY_FOR_PICKUP, 'noop', 'admin-1')).rejects.toThrow(/already/i);
      expect(save).not.toHaveBeenCalled();
    });
  });
});
