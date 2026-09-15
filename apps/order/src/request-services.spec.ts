import { createParcelSchema, errandReceiptSchema } from '@ore/contracts';

describe('request-only service contracts', () => {
  it('accepts a sealed Ghana Parcel with sender and recipient custody data', () => {
    const parcel = createParcelSchema.parse({
      sender: {
        name: 'Sender One',
        phone: '+233241234567',
        address: { label: 'Kotokuraba', lat: 5.106, lng: -1.246, source: 'MAP' },
      },
      recipient: {
        name: 'Recipient Two',
        phone: '+233201234567',
        address: { label: 'UCC', lat: 5.1174, lng: -1.299, source: 'MAP' },
      },
      category: 'SMALL_PACKAGE',
      weightKg: 2,
      declaredValuePesewas: 15000,
      description: 'Sealed documents and accessories',
      sealed: true,
      prohibitedItemsAcknowledged: true,
    });
    expect(parcel.pickupMode).toBe('MEET_DOOR');
    expect(parcel.proofMode).toBe('PIN');
  });

  it('rejects an unsealed Parcel and rejects a receipt without a photo', () => {
    expect(() => createParcelSchema.parse({
      sender: { name: 'Sender One', phone: '+233241234567', address: { label: 'A', lat: 5.1, lng: -1.2, source: 'MAP' } },
      recipient: { name: 'Recipient Two', phone: '+233201234567', address: { label: 'B', lat: 5.11, lng: -1.21, source: 'MAP' } },
      category: 'DOCUMENTS',
      weightKg: 1,
      declaredValuePesewas: 0,
      description: 'Paperwork',
      sealed: false,
      prohibitedItemsAcknowledged: true,
    })).toThrow();
    expect(() => errandReceiptSchema.parse({ amountPesewas: 1000 })).toThrow();
  });
});
