import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DeliveryAddressDto, OrderStatus, OrderType, PaymentMethod } from '@ore/contracts';

/** Doc §Errands — escrow + buy-and-deliver state stored on the order. */
export interface ParcelJson {
  sender: { name: string; phone: string; address: DeliveryAddressDto };
  recipient: { name: string; phone: string; address: DeliveryAddressDto };
  category: string;
  weightKg: number;
  dimensionsCm: { length: number; width: number; height: number } | null;
  declaredValuePesewas: number;
  description: string;
  fragile: boolean;
  sealed: boolean;
  pickupMode: 'MEET_DOOR' | 'MEET_CURB';
  proofMode: 'PIN' | 'SIGNATURE' | 'PHOTO' | 'PIN_AND_PHOTO';
  prohibitedItemsAcknowledged: boolean;
  parcelStatus: string;
  returnReason: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
}

export interface ErrandJson {
  task: string;
  shopName: string | null;
  shopLat: number;
  shopLng: number;
  budgetPesewas: number;
  escrowPesewas: number; // total charged = budget + errandFee + deliveryFee
  errandStatus: string;
  spentPesewas: number; // accepted receipts
  receipts: { amountPesewas: number; photoKey: string; note: string | null; at: string }[];
  substitution: { item: string; pricePesewas: number; status: string } | null;
  trustTier: string | null; // rider tier snapshot at accept
  compensationPesewas: number; // failed-errand compensation (customer)
  shoppedAt: string | null;
  purchasedAt: string | null;
}

@Entity({ schema: 'order' })
@Index(['checkoutId', 'status'])
@Index('order_gift_token_uidx', ['giftToken'], { unique: true, where: `"giftToken" IS NOT NULL` })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  ref: string; // human/support number: ore-cc-XXXXXX

  @Column()
  checkoutId: string;

  @Column({ type: 'varchar', default: OrderType.CATALOGUE })
  orderType: OrderType;

  @Column({ type: 'simple-json', nullable: true })
  errandJson: ErrandJson | null; // set only for orderType=ERRAND

  @Column({ type: 'simple-json', nullable: true })
  parcelJson: ParcelJson | null; // set only for orderType=PARCEL

  /** Doc §3 Case 2 — gift/order-for-someone: recipient confirms the drop before dispatch. */
  @Column({ type: 'simple-json', nullable: true })
  recipientJson: {
    name: string;
    phone: string;
    status: 'AWAITING_CONFIRMATION' | 'CONFIRMED';
    token: string;
    confirmedAt: string | null;
    address: DeliveryAddressDto | null;
  } | null;

  /** Indexed gift-link token (same value as recipientJson.token) so confirm does not scan rows. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  giftToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  customerPhone: string | null; // needed to init the escrow/charge after the recipient confirms

  @Column()
  vendorId: string;

  @Column()
  vendorName: string;

  @Column({ type: 'varchar', default: 'FOOD' })
  vendorType: string;

  @Column({ type: 'varchar', default: 'FO' })
  serviceCode: string;

  @Column({ type: 'int', default: 1 })
  feePolicyVersion: number;

  /**
   * Vendor commission in basis points (1800 = 18%).
   *
   * Was `float`. A rate is not money, but it decides money: 17.7 has no exact binary float
   * representation, so recomputing a vendor's share from the stored rate could disagree with
   * what the customer was actually charged — on some orders and not others, which is the
   * expensive kind of discrepancy to chase.
   */
  @Column({ type: 'int', default: 0 })
  commissionBps: number;

  @Column()
  customerId: string;

  @Column({ type: 'varchar', default: PaymentMethod.PREPAID })
  paymentMethod: PaymentMethod;

  @Column({ type: 'varchar', default: OrderStatus.PENDING_PAYMENT })
  status: OrderStatus;

  @Column({ type: 'varchar', default: 'NOT_REQUIRED' })
  prescriptionStatus: string;

  @Column({ type: 'varchar', nullable: true })
  prescriptionKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  prescriptionContentType: string | null;

  @Column({ type: 'text', nullable: true })
  prescriptionReviewNote: string | null;

  @Column({ type: 'simple-json', nullable: true })
  conditionJson: Record<string, unknown> | null;

  /** Market/weight fulfillment snapshot; financial adjustments are not applied without a payment contract. */
  @Column({ type: 'simple-json', nullable: true })
  marketFulfillmentJson: {
    recordedAt: string;
    lines: { orderItemId: string; actualQuantity: number; unit: string; actualPricePesewas: number | null; note: string | null }[];
  } | null;

  @Column({ type: 'varchar', nullable: true })
  laundryStage: string | null;

  @Column({ type: 'simple-json' })
  addressJson: DeliveryAddressDto;

  /** Snapshot of the Vendor branch used for fulfilment. Null for legacy orders. */
  @Column({ type: 'simple-json', nullable: true })
  pickupJson: { locationId: string | null; name: string; address: string | null; lat: number; lng: number } | null;

  @Column({ type: 'int' })
  prepTimeMin: number;

  @Column({ type: 'int', nullable: true })
  originalPrepTimeMin: number | null;

  @Column({ type: 'int', default: 0 })
  prepTimeExtendedByMin: number;

  @Column({ type: 'int', default: 0 })
  prepExtensionCount: number;

  @Column({ type: Date, nullable: true })
  lastPrepExtendedAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  lastPrepExtendedBy: string | null;

  @Column({ type: 'text', nullable: true })
  lastPrepExtensionReason: string | null;

  @Column({ type: 'int' })
  subtotalPesewas: number;

  @Column({ type: 'int' })
  deliveryFeePesewas: number;

  @Column({ type: 'int' })
  serviceFeePesewas: number;

  @Column({ type: 'int' })
  platformFeePesewas: number;

  @Column({ type: 'int' })
  vendorSharePesewas: number;

  @Column({ type: 'int' })
  riderFeePesewas: number;

  @Column({ type: 'int' })
  totalPesewas: number;

  @Column({ type: 'varchar', nullable: true })
  promotionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  promotionTitle: string | null;

  @Column({ type: 'int', default: 0 })
  promotionDiscountPesewas: number;

  /** Customer-paid rider tip. Credited to the assigned rider on delivery. */
  @Column({ type: 'int', default: 0 })
  tipPesewas: number;

  /** Platform-funded peak pay. Credited to the assigned rider on delivery. Not charged to the customer. */
  @Column({ type: 'int', default: 0 })
  peakPayPesewas: number;

  @Column({ type: 'varchar', nullable: true })
  note: string | null;

  @Column({ type: 'boolean', default: false })
  leaveAtDoor: boolean;

  @Column({ type: 'varchar', nullable: true })
  dropNote: string | null;

  @Column({ type: Date, nullable: true })
  scheduledFor: Date | null;

  @Column({ type: 'varchar', default: 'STANDARD' })
  serviceLevel: 'STANDARD' | 'SCHEDULED' | 'PRIORITY';

  @Column({ type: 'varchar', nullable: true })
  deliverySignatureKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  deliverySignatureContentType: string | null;

  @Column({ type: 'varchar', nullable: true })
  riderId: string | null;

  @Column({ type: 'varchar', nullable: true })
  otpHash: string | null;

  /**
   * Delivery OTP at rest — AES-256-GCM encrypted with the service key (never plaintext).
   * The plaintext is shown to the order owner on demand (G21) and to the gift recipient
   * via SMS by the notification service (which calls the internal reveal endpoint).
   */
  @Column({ type: 'text', nullable: true })
  otpCipher: string | null;

  @Column({ type: 'int', default: 0 })
  otpAttempts: number;

  @Column({ type: Date, nullable: true })
  acceptedAt: Date | null;

  @Column({ type: Date, nullable: true })
  readyAt: Date | null;

  @Column({ type: Date, nullable: true })
  pickedUpAt: Date | null;

  @Column({ type: Date, nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  deliveryProofKey: string | null;

  @Column({ type: 'varchar', nullable: true })
  deliveryProofContentType: string | null;

  @Column({ type: Date, nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  cancelReason: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
