import { DeliveryAddressDto, OrderItemSnapshot, PaymentMethod, VendorType } from '@ore/contracts';

export interface OrderCreatePayload {
  recipient?: { name: string; phone: string } | null;
  customerPhone?: string | null;
  vendorId: string;
  vendorName: string;
  vendorType: VendorType;
  serviceCode: string;
  feePolicyVersion: number;
  commissionBps: number;
  customerId: string;
  address: DeliveryAddressDto;
  /** Optional Vendor branch snapshot. Older Customer clients omit this and use the Vendor primary coordinates. */
  pickup?: { locationId?: string | null; name: string; address?: string | null; lat: number; lng: number } | null;
  items: OrderItemSnapshot[];
  paymentMethod: PaymentMethod;
  prepTimeMin: number;
  subtotalPesewas: number;
  deliveryFeePesewas: number;
  serviceFeePesewas: number;
  platformFeePesewas: number;
  vendorSharePesewas: number;
  riderFeePesewas: number;
  totalPesewas: number;
  promotionId?: string | null;
  promotionTitle?: string | null;
  promotionDiscountPesewas?: number;
  tipPesewas?: number;
  note?: string;
  leaveAtDoor?: boolean;
  dropNote?: string | null;
  scheduledFor?: string | null;
  serviceLevel?: 'STANDARD' | 'SCHEDULED' | 'PRIORITY';
}

export interface CreatedOrder {
  orderId: string;
  vendorId: string;
  vendorName: string;
  vendorType: VendorType;
  serviceCode: string;
  feePolicyVersion: number;
  serviceLevel?: 'STANDARD' | 'SCHEDULED' | 'PRIORITY';
  status: string;
  paymentMethod: PaymentMethod;
  subtotalPesewas: number;
  deliveryFeePesewas: number;
  serviceFeePesewas: number;
  commissionBps: number;
  totalPesewas: number;
  promotionId?: string | null;
  promotionTitle?: string | null;
  promotionDiscountPesewas?: number;
  tipPesewas?: number;
  prepTimeMin: number;
}
