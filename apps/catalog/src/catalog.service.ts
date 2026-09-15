import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, MoreThan, Repository } from 'typeorm';
import { EVENTS, PrepTimeSignals, ResidentStatus, Role, VendorDto, VendorLocationDto, MenuItemDto, SearchItemDto, VendorTaxProfileUpsertDto, isCatalogueVendorType } from '@ore/contracts';
import { distanceKm, isPointInZone, loadZone } from '@ore/geo';
import { ORE_BUS, ORE_ENV, ORE_STORAGE, JwtPayload, internalFetch, serviceUrl } from '@ore/core';
import { Bus } from '@ore/bus';
import { OreEnv } from '@ore/config';
import { Vendor } from './entities/vendor.entity';
import { VendorStory } from './entities/vendor-story.entity';
import { VendorPromotion } from './entities/vendor-promotion.entity';
import { StockReservation } from './entities/stock-reservation.entity';
import { VendorReview } from './entities/vendor-review.entity';
import { PromotionRedemption } from './entities/promotion-redemption.entity';
import { VendorLocation } from './entities/vendor-location.entity';
import { VendorStaff } from './entities/vendor-staff.entity';
import { VendorPosConnection } from './entities/vendor-pos-connection.entity';
import { CustomerFavourite } from './entities/customer-favourite.entity';
import { CustomerVoucher } from './entities/customer-voucher.entity';
import { MenuItem } from './entities/menu-item.entity';
import { LocalStorageDriver, StorageDriver, storageKeyFor } from '@ore/storage';
import { isOpenNow } from './hours';
import { VendorSignalOrder, prepTimeSignals } from './vendor-signals';

export interface VendorListView {
  vendors: VendorDto[];
  zoneId: string;
  count: number;
}

interface VendorAnalyticsOrder {
  orderId: string;
  status: string;
  totalPesewas: number;
  prepTimeMin: number;
  customer?: { id: string } | null;
  items?: { itemId: string; name: string; qty: number }[];
  timeline?: { at: string }[];
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Vendor) private readonly vendors: Repository<Vendor>,
    @InjectRepository(VendorStory) private readonly stories: Repository<VendorStory>,
    @InjectRepository(VendorPromotion) private readonly promotions: Repository<VendorPromotion>,
    @InjectRepository(StockReservation) private readonly reservations: Repository<StockReservation>,
    @InjectRepository(VendorReview) private readonly reviews: Repository<VendorReview>,
    @InjectRepository(PromotionRedemption) private readonly redemptions: Repository<PromotionRedemption>,
    @InjectRepository(VendorLocation) private readonly locations: Repository<VendorLocation>,
    @InjectRepository(VendorStaff) private readonly staff: Repository<VendorStaff>,
    @InjectRepository(VendorPosConnection) private readonly posConnections: Repository<VendorPosConnection>,
    @InjectRepository(CustomerFavourite) private readonly favourites: Repository<CustomerFavourite>,
    @InjectRepository(CustomerVoucher) private readonly vouchers: Repository<CustomerVoucher>,
    @InjectRepository(MenuItem) private readonly items: Repository<MenuItem>,
    @Inject(ORE_BUS) private readonly bus: Bus,
    @Inject(ORE_ENV) private readonly env: OreEnv,
    @Inject(ORE_STORAGE) private readonly storage: StorageDriver,
  ) {}

  /** G01/G02/G03: zone-locked browse — only vendors whose radius covers the customer point. */
  async listVendors(lat: number, lng: number, type?: string): Promise<VendorListView> {
    const zone = loadZone();
    const point = { lat, lng };
    if (!isPointInZone(point, zone)) {
      throw new BadRequestException('Location is outside the Cape Coast delivery zone');
    }
    if (type && !isCatalogueVendorType(type)) {
      throw new BadRequestException('Unknown vendor service');
    }
    const all = await this.vendors.find();
    const now = new Date();
    const vendors: VendorDto[] = all
      .filter((v) => v.approved && isCatalogueVendorType(v.vendorType))
      .filter((v) => (type ? v.vendorType === type : true))
      .filter((v) => distanceKm(point, { lat: v.lat, lng: v.lng }) <= v.deliveryRadiusKm)
      .map((v) => ({
        id: v.id,
        name: v.name,
        vendorType: v.vendorType,
        approved: v.approved,
        publicId: v.publicId,
        lat: v.lat,
        lng: v.lng,
        deliveryRadiusKm: v.deliveryRadiusKm,
        acceptsCod: v.acceptsCod,
        accepting: v.accepting,
        openNow: isOpenNow(v.hoursJson, now, v.holidayHoursJson),
        distanceKm: round1(distanceKm(point, { lat: v.lat, lng: v.lng })),
      }))
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    return { vendors, zoneId: zone.id, count: vendors.length };
  }

  /** Onboarding approval creates the live vendor (doc §Onboarding). */
  /**
   * Idempotent per owner (audit F-BUG-23). The old plain insert meant that when
   * onboarding's approve() partially failed and an admin retried, a SECOND vendor row
   * was created for the same owner — and owner→vendor resolution elsewhere picks the
   * first row non-deterministically. Now a retry finds the existing vendor and updates
   * it in place instead of duplicating.
   */
  async onboardVendor(body: { ownerUserId: string; name: string; vendorType: string; lat: number; lng: number; publicId: string; payoutAccountJson?: Record<string, unknown> | null }): Promise<Vendor> {
    if (!isCatalogueVendorType(body.vendorType)) {
      throw new BadRequestException('Vendor type must be one of FOOD, GROCERY, MARKET, PHARMACY, SHOP, LAUNDRY');
    }
    const existing = await this.vendors.findOne({ where: { ownerUserId: body.ownerUserId } });
    if (existing) {
      existing.name = body.name;
      existing.vendorType = body.vendorType as never;
      existing.lat = body.lat;
      existing.lng = body.lng;
      existing.approved = true;
      existing.publicId = body.publicId;
      existing.payoutAccountJson = body.payoutAccountJson ?? null;
      return this.vendors.save(existing);
    }
    return this.vendors.save(
      this.vendors.create({
        ownerUserId: body.ownerUserId,
        name: body.name,
        vendorType: body.vendorType as never,
        lat: body.lat,
        lng: body.lng,
        approved: true,
        publicId: body.publicId,
        payoutAccountJson: body.payoutAccountJson ?? null,
      }),
    );
  }

  /** Internal: resolve Vendor ownership for owners and active staff. */
  async getVendorsForUser(userId: string): Promise<Array<{ id: string; name: string; vendorType: string; accepting: boolean; approved: boolean; publicId: string | null }>> {
    const [owned, staffRows] = await Promise.all([
      this.vendors.find({ where: { ownerUserId: userId }, select: { id: true, name: true, vendorType: true, accepting: true, approved: true, publicId: true } }),
      this.staff.find({ where: { userId, active: true } }),
    ]);
    const ownedIds = new Set(owned.map((vendor) => vendor.id));
    const staffIds = staffRows.map((row) => row.vendorId).filter((id) => !ownedIds.has(id));
    const staffVendors = staffIds.length ? await this.vendors.find({ where: staffIds.map((id) => ({ id })), select: { id: true, name: true, vendorType: true, accepting: true, approved: true, publicId: true } }) : [];
    return [...owned, ...staffVendors];
  }

  /** Internal: vendor metadata for cart/dispatch without a token. */
  async getVendorMeta(vendorId: string): Promise<VendorDto | null> {
    const vendor = await this.vendors.findOne({ where: { id: vendorId } });
    if (!vendor) return null;
    return this.toVendorDtoWithLocations(vendor);
  }

  /**
   * Live prep-time signals for a vendor, for dispatch's arrival timing.
   *
   * Dispatch plans the rider's arrival off the order's static `prepTimeMin`. That number is a
   * property of the menu, not of the kitchen — it does not know that eleven orders are already
   * on the pass, or that this vendor has missed its promise on half of the last hour's orders.
   * Both facts are already in the order service; nothing was reading them.
   */
  async getVendorPrepSignals(vendorId: string): Promise<PrepTimeSignals & { basePrepTimeMin: number }> {
    const vendor = await this.vendors.findOne({ where: { id: vendorId } });
    const basePrepTimeMin = vendor?.defaultPrepTimeMin ?? 10;

    // Degrades to "no signal" rather than failing. Dispatch would otherwise be unable to
    // schedule anything at all whenever the order service is briefly unreachable, which trades a
    // timing improvement for an outage.
    let orders: VendorSignalOrder[] = [];
    try {
      const res = await internalFetch(`${serviceUrl('order')}/internal/vendors/${vendorId}/orders`);
      if (res.ok) orders = (await res.json()) as VendorSignalOrder[];
    } catch {
      orders = [];
    }

    return { ...prepTimeSignals(orders), basePrepTimeMin };
  }

  async getVendorTaxProfile(vendorId: string): Promise<{ id: string; taxResidentStatus: ResidentStatus; taxIdentificationNumber: string | null; taxProfileJson: Record<string, unknown> | null } | null> {
    const vendor = await this.vendors.findOne({ where: { id: vendorId } });
    if (!vendor) return null;
    return this.toVendorTaxProfile(vendor);
  }

  async updateVendorTaxProfile(user: JwtPayload, vendorId: string, body: VendorTaxProfileUpsertDto): Promise<{ id: string; taxResidentStatus: ResidentStatus; taxIdentificationNumber: string | null; taxProfileJson: Record<string, unknown> | null }> {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Admin role required');
    const vendor = await this.findVendor(vendorId);
    vendor.taxResidentStatus = body.residentStatus;
    if (body.taxIdentificationNumber !== undefined) {
      vendor.taxIdentificationNumber = body.taxIdentificationNumber?.trim() || null;
    }
    if (body.taxProfileJson !== undefined) {
      vendor.taxProfileJson = body.taxProfileJson ?? null;
    }
    const saved = await this.vendors.save(vendor);
    await this.bus.publish(EVENTS.VENDOR_UPDATED, { vendorId: saved.id, name: saved.name, taxProfileUpdated: true });
    return this.toVendorTaxProfile(saved);
  }

  async getVendor(vendorId: string): Promise<{ vendor: VendorDto; menu: MenuItemDto[] }> {
    const vendor = await this.findVendor(vendorId);
    const menu = await this.items.find({ where: { vendorId }, order: { category: 'ASC', name: 'ASC' } });
    return { vendor: await this.toVendorDtoWithLocations(vendor), menu: menu.map((item) => this.toItemDto(item)) };
  }

  async getMyVendor(user: JwtPayload): Promise<{ vendor: VendorDto; menu: MenuItemDto[] }> {
    if (user.role !== Role.VENDOR) throw new ForbiddenException('Vendor role required');
    const vendor = await this.vendors.findOne({
      where: { ownerUserId: user.sub },
      order: { createdAt: 'DESC' },
    });
    if (!vendor) throw new NotFoundException('Vendor profile not found');
    const menu = await this.items.find({
      where: { vendorId: vendor.id },
      order: { category: 'ASC', name: 'ASC' },
    });
    return { vendor: this.toVendorDto(vendor), menu: menu.map((item) => this.toItemDto(item)) };
  }

  async listLocations(user: JwtPayload, vendorId: string): Promise<VendorLocation[]> {
    await this.ownedVendor(user, vendorId);
    return this.locations.find({ where: { vendorId, active: true }, order: { createdAt: 'ASC' } });
  }

  async createLocation(user: JwtPayload, vendorId: string, body: { name: string; address: string; lat: number; lng: number; deliveryRadiusKm?: number; accepting?: boolean }): Promise<VendorLocation> {
    await this.requireVendorOwner(user, vendorId);
    if (!body.name.trim() || !body.address.trim()) throw new BadRequestException('Location name and address are required');
    if (!isPointInZone({ lat: body.lat, lng: body.lng }, loadZone())) throw new BadRequestException('Location must be inside the Cape Coast zone');
    return this.locations.save(this.locations.create({ vendorId, name: body.name.trim(), address: body.address.trim(), lat: body.lat, lng: body.lng, deliveryRadiusKm: body.deliveryRadiusKm ?? 8, accepting: body.accepting ?? true, hoursJson: null, holidayHoursJson: null, active: true }));
  }

  async updateLocation(user: JwtPayload, vendorId: string, locationId: string, body: Partial<VendorLocation>): Promise<VendorLocation> {
    await this.requireVendorOwner(user, vendorId);
    const location = await this.locations.findOne({ where: { id: locationId, vendorId, active: true } });
    if (!location) throw new NotFoundException('Vendor location not found');
    if (body.name !== undefined) location.name = body.name.trim();
    if (body.address !== undefined) location.address = body.address.trim();
    if (body.lat !== undefined) location.lat = body.lat;
    if (body.lng !== undefined) location.lng = body.lng;
    if (body.lat !== undefined || body.lng !== undefined) if (!isPointInZone({ lat: location.lat, lng: location.lng }, loadZone())) throw new BadRequestException('Location must be inside the Cape Coast zone');
    if (body.deliveryRadiusKm !== undefined) location.deliveryRadiusKm = body.deliveryRadiusKm;
    if (body.accepting !== undefined) location.accepting = body.accepting;
    if (body.hoursJson !== undefined) location.hoursJson = body.hoursJson;
    if (body.holidayHoursJson !== undefined) location.holidayHoursJson = body.holidayHoursJson;
    return this.locations.save(location);
  }

  async deactivateLocation(user: JwtPayload, vendorId: string, locationId: string): Promise<void> {
    await this.requireVendorOwner(user, vendorId);
    const location = await this.locations.findOne({ where: { id: locationId, vendorId, active: true } });
    if (!location) throw new NotFoundException('Vendor location not found');
    location.active = false;
    location.accepting = false;
    await this.locations.save(location);
  }

  async listStaff(user: JwtPayload, vendorId: string): Promise<VendorStaff[]> {
    await this.requireVendorOwner(user, vendorId);
    return this.staff.find({ where: { vendorId }, order: { createdAt: 'ASC' } });
  }

  async addStaff(user: JwtPayload, vendorId: string, body: { userId: string; displayName: string; phone?: string; staffRole?: string }): Promise<VendorStaff> {
    await this.requireVendorOwner(user, vendorId);
    if (!body.userId.trim() || !body.displayName.trim()) throw new BadRequestException('Staff userId and display name are required');
    const role = body.staffRole ?? 'ORDER_OPERATOR';
    if (!['MANAGER', 'ORDER_OPERATOR', 'CATALOG_EDITOR', 'FINANCE_VIEWER'].includes(role)) throw new BadRequestException('Unknown Vendor staff role');
    const existing = await this.staff.findOne({ where: { vendorId, userId: body.userId.trim() } });
    if (existing) throw new ConflictException('This user is already assigned to the Vendor');
    return this.staff.save(this.staff.create({ vendorId, userId: body.userId.trim(), displayName: body.displayName.trim(), phone: body.phone?.trim() || null, staffRole: role as never, active: true }));
  }

  async setStaffActive(user: JwtPayload, vendorId: string, staffId: string, active: boolean): Promise<VendorStaff> {
    await this.requireVendorOwner(user, vendorId);
    const member = await this.staff.findOne({ where: { id: staffId, vendorId } });
    if (!member) throw new NotFoundException('Vendor staff member not found');
    member.active = active;
    return this.staff.save(member);
  }

  async getPosConnection(user: JwtPayload, vendorId: string): Promise<{ id: string; provider: string; externalStoreId: string | null; active: boolean; lastReceivedAt: string | null; webhookPath: string } | null> {
    await this.requireVendorOwner(user, vendorId);
    const connection = await this.posConnections.findOne({ where: { vendorId } });
    if (!connection) return null;
    return { id: connection.id, provider: connection.provider, externalStoreId: connection.externalStoreId, active: connection.active, lastReceivedAt: connection.lastReceivedAt?.toISOString() ?? null, webhookPath: `/api/catalog/pos/webhook/${connection.id}` };
  }

  async connectPos(user: JwtPayload, vendorId: string, provider: string, externalStoreId?: string): Promise<{ connection: { id: string; provider: string; externalStoreId: string | null; active: boolean; lastReceivedAt: string | null; webhookPath: string }; token: string }> {
    await this.requireVendorOwner(user, vendorId);
    if (!provider.trim()) throw new BadRequestException('POS provider name is required');
    const token = randomBytes(24).toString('hex');
    let connection = await this.posConnections.findOne({ where: { vendorId } });
    if (connection) {
      connection.provider = provider.trim();
      connection.externalStoreId = externalStoreId?.trim() || null;
      connection.tokenHash = createHash('sha256').update(token).digest('hex');
      connection.active = true;
      connection.lastReceivedAt = null;
    } else {
      connection = this.posConnections.create({ vendorId, provider: provider.trim(), externalStoreId: externalStoreId?.trim() || null, tokenHash: createHash('sha256').update(token).digest('hex'), active: true, lastReceivedAt: null });
    }
    connection = await this.posConnections.save(connection);
    return { connection: { id: connection.id, provider: connection.provider, externalStoreId: connection.externalStoreId, active: connection.active, lastReceivedAt: connection.lastReceivedAt?.toISOString() ?? null, webhookPath: `/api/catalog/pos/webhook/${connection.id}` }, token };
  }

  async disconnectPos(user: JwtPayload, vendorId: string): Promise<void> {
    await this.requireVendorOwner(user, vendorId);
    const connection = await this.posConnections.findOne({ where: { vendorId } });
    if (connection) { connection.active = false; await this.posConnections.save(connection); }
  }

  async handlePosWebhook(connectionId: string, token: string | undefined, body: { event?: string; itemId?: string; stock?: number; available?: boolean }): Promise<{ accepted: boolean; event: string }> {
    const connection = await this.posConnections.findOne({ where: { id: connectionId, active: true } });
    // Audit L-1: constant-time compare of the token digests. Practically unexploitable (both
    // sides are SHA-256 of a 192-bit randomBytes token, so a timing leak reveals a digest,
    // not the secret), but every other secret comparison in the codebase uses
    // timingSafeEqual and this costs nothing.
    const provided = token ? createHash('sha256').update(token).digest() : null;
    const stored = connection?.tokenHash ? Buffer.from(connection.tokenHash, 'hex') : null;
    const tokenOk = Boolean(
      connection && provided && stored &&
        provided.length === stored.length &&
        timingSafeEqual(provided, stored),
    );
    if (!connection || !tokenOk) throw new ForbiddenException('Invalid POS webhook credentials');
    connection.lastReceivedAt = new Date();
    await this.posConnections.save(connection);
    const event = body.event ?? 'received';
    if (event === 'inventory.updated' && body.itemId) {
      const item = await this.items.findOne({ where: { id: body.itemId, vendorId: connection.vendorId } });
      if (!item) throw new NotFoundException('POS item not found');
      if (body.stock !== undefined) { if (!Number.isInteger(body.stock) || body.stock < 0) throw new BadRequestException('POS stock must be a non-negative integer'); item.stock = body.stock; }
      if (body.available !== undefined) item.available = body.available;
      await this.items.save(item);
    }
    return { accepted: true, event };
  }

  async getVendorCategories(user: JwtPayload, vendorId: string): Promise<Array<{ name: string; itemCount: number }>> {
    await this.ownedVendor(user, vendorId);
    const items = await this.items.find({ where: { vendorId }, order: { category: 'ASC', name: 'ASC' } });
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    return [...counts.entries()].map(([name, itemCount]) => ({ name, itemCount }));
  }

  async renameVendorCategory(user: JwtPayload, vendorId: string, oldName: string, newName: string): Promise<Array<{ name: string; itemCount: number }>> {
    await this.ownedVendor(user, vendorId);
    const target = newName.trim();
    if (target.length < 1 || target.length > 80) throw new BadRequestException('Category name must be between 1 and 80 characters');
    const current = oldName.trim();
    if (!current) throw new BadRequestException('Current category is required');
    const items = await this.items.find({ where: { vendorId, category: current } });
    if (items.length === 0) throw new NotFoundException('Category not found');
    if (target !== current) {
      const duplicate = await this.items.findOne({ where: { vendorId, category: target } });
      if (duplicate) throw new ConflictException('A category with that name already exists');
      for (const item of items) item.category = target;
      await this.items.save(items);
      await this.bus.publish(EVENTS.VENDOR_UPDATED, { vendorId, categoryRenamed: true, from: current, to: target });
    }
    return this.getVendorCategories(user, vendorId);
  }

  async getMyAnalytics(user: JwtPayload, period: string): Promise<Record<string, unknown>> {
    const snapshot = await this.getMyVendor(user);
    const normalizedPeriod = ['day', 'week', 'month'].includes(period.toLowerCase()) ? period.toLowerCase() : 'week';
    const start = new Date();
    if (normalizedPeriod === 'day') start.setDate(start.getDate() - 1);
    if (normalizedPeriod === 'week') start.setDate(start.getDate() - 7);
    if (normalizedPeriod === 'month') start.setMonth(start.getMonth() - 1);

    const response = await internalFetch(`${serviceUrl('order')}/internal/vendors/${snapshot.vendor.id}/orders`);
    if (!response.ok) throw new BadRequestException('Unable to load Vendor analytics orders');
    const orders = (await response.json()) as VendorAnalyticsOrder[];
    return calculateVendorAnalytics(orders, start, snapshot.vendor.id, normalizedPeriod);
  }

  /** G04-friendly search: item text match across vendors that can serve the point. */
  async searchItems(q: string, lat: number, lng: number): Promise<SearchItemDto[]> {
    const zone = loadZone();
    const point = { lat, lng };
    if (!isPointInZone(point, zone)) throw new BadRequestException('Location is outside the Cape Coast delivery zone');

    const [items, vendors] = await Promise.all([
      this.items.find({ where: [{ name: Like(`%${q}%`) }, { category: Like(`%${q}%`) }], take: 50 }),
      this.vendors.find(),
    ]);
    const vendorMap = new Map(vendors.map((v) => [v.id, v]));
    const now = new Date();
    return items
      .filter((i) => {
        const v = vendorMap.get(i.vendorId);
        if (!v || !i.available || !v.accepting || !v.approved) return false;
        if (!isOpenNow(v.hoursJson, now, v.holidayHoursJson)) return false;
        return distanceKm(point, { lat: v.lat, lng: v.lng }) <= v.deliveryRadiusKm;
      })
      .map((i) => {
        const v = vendorMap.get(i.vendorId)!;
        return {
          ...this.toItemDto(i),
          vendorName: v.name,
          vendorType: v.vendorType,
          vendorLat: v.lat,
          vendorLng: v.lng,
        };
      });
  }

  /** Internal: atomically reserve quantity-tracked stock for a confirmed order. */
  async reserveStock(orderId: string, lines: Array<{ itemId: string; qty: number }>): Promise<{ orderId: string; reserved: boolean }> {
    if (!orderId || !Array.isArray(lines)) throw new BadRequestException('Stock reservation payload is invalid');
    await this.items.manager.transaction(async (manager) => {
      const itemRepo = manager.getRepository(MenuItem);
      const reservationRepo = manager.getRepository(StockReservation);
      const existing = await reservationRepo.find({ where: { orderId } });
      if (existing.some((row) => row.status === 'RESERVED' || row.status === 'CONSUMED')) return;
      const quantities = new Map<string, number>();
      for (const line of lines) {
        if (!line || typeof line.itemId !== 'string' || !Number.isInteger(line.qty) || line.qty < 1) throw new BadRequestException('Stock reservation lines are invalid');
        quantities.set(line.itemId, (quantities.get(line.itemId) ?? 0) + line.qty);
      }
      for (const [itemId, qty] of quantities) {
        const item = await itemRepo.findOne({ where: { id: itemId } });
        if (!item) throw new NotFoundException(`Catalogue item ${itemId} not found`);
        if (item.stock === null) continue; // null explicitly means inventory is not tracked for this item
        // Atomic conditional decrement. The previous version used
        // `lock: { mode: 'pessimistic_write' }`, which SQLite does not support at all
        // (LockNotSupportedOnGivenDriverError), so on the zero-infra dev database every
        // reservation 500'd and no vendor could ever accept an order. This form is
        // race-free on both drivers: Postgres takes the row lock and re-checks the
        // predicate on commit, and SQLite serialises writes.
        const res = await itemRepo
          .createQueryBuilder()
          .update(MenuItem)
          .set({ stock: () => 'stock - :qty' })
          .where('id = :id AND stock IS NOT NULL AND stock >= :qty', { id: itemId, qty })
          .execute();
        if (!res.affected) {
          const fresh = await itemRepo.findOne({ where: { id: itemId } });
          if (fresh && fresh.stock !== null && fresh.stock < qty) {
            throw new ConflictException(`Insufficient stock for ${fresh.name}`);
          }
          continue; // stock became untracked between the read and the update
        }
        await reservationRepo.save(reservationRepo.create({ orderId, itemId, qty, status: 'RESERVED' }));
      }
    });
    return { orderId, reserved: true };
  }

  /** Internal: release a reservation when an order is cancelled before pickup. */
  async releaseStock(orderId: string): Promise<{ orderId: string; released: boolean }> {
    await this.items.manager.transaction(async (manager) => {
      const itemRepo = manager.getRepository(MenuItem);
      const reservationRepo = manager.getRepository(StockReservation);
      const rows = await reservationRepo.find({ where: { orderId, status: 'RESERVED' } });
      for (const row of rows) {
        // Same reasoning as reserveStock: atomic UPDATE instead of a pessimistic lock,
        // which SQLite cannot honour.
        await itemRepo
          .createQueryBuilder()
          .update(MenuItem)
          .set({ stock: () => 'stock + :qty' })
          .where('id = :id AND stock IS NOT NULL', { id: row.itemId, qty: row.qty })
          .execute();
        row.status = 'RELEASED';
        await reservationRepo.save(row);
      }
    });
    return { orderId, released: true };
  }

  /** Internal: mark reserved stock as consumed when Dispatch confirms pickup. */
  async consumeStock(orderId: string): Promise<{ orderId: string; consumed: boolean }> {
    await this.reservations.update({ orderId, status: 'RESERVED' }, { status: 'CONSUMED' });
    return { orderId, consumed: true };
  }

  /** Internal: fetch items by ids (cart snapshot + checkout validation). */
  async getItemsByIds(ids: string[]): Promise<MenuItemDto[]> {
    const items = await this.items.find({ where: { id: In(ids) } });
    return items.map((item) => this.toItemDto(item));
  }

  async getItem(itemId: string): Promise<MenuItemDto> {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    return this.toItemDto(item);
  }

  // ── Vendor role operations ────────────────────────────────────────

  async createVendor(user: JwtPayload, body: { name: string; lat: number; lng: number; vendorType?: string; deliveryRadiusKm?: number; acceptsCod?: boolean; defaultPrepTimeMin?: number }): Promise<Vendor> {
    if (user.role !== Role.VENDOR) throw new ForbiddenException('Vendor role required');
    if (!isPointInZone({ lat: body.lat, lng: body.lng }, loadZone())) {
      throw new BadRequestException('Vendor location must be inside the Cape Coast zone');
    }
    const vendorType = body.vendorType ?? 'FOOD';
    if (!isCatalogueVendorType(vendorType)) {
      throw new BadRequestException('Vendor type must be one of FOOD, GROCERY, MARKET, PHARMACY, SHOP, LAUNDRY');
    }
    const vendor = await this.vendors.save(
      this.vendors.create({
        ownerUserId: user.sub,
        name: body.name,
        vendorType: vendorType as never,
        lat: body.lat,
        lng: body.lng,
        deliveryRadiusKm: body.deliveryRadiusKm ?? 8,
        acceptsCod: body.acceptsCod ?? true,
        defaultPrepTimeMin: body.defaultPrepTimeMin ?? 10,
      }),
    );
    await this.bus.publish(EVENTS.VENDOR_UPDATED, { vendorId: vendor.id, name: vendor.name });
    return vendor;
  }

  async updateVendor(user: JwtPayload, vendorId: string, body: Partial<Vendor>): Promise<Vendor> {
    const vendor = await this.ownedVendor(user, vendorId);
    const updates: Partial<Vendor> = {};
    const allowedFields: (keyof Vendor)[] = [
      'name',
      'lat',
      'lng',
      'deliveryRadiusKm',
      'acceptsCod',
      'accepting',
      'maxConcurrentOrders',
      'defaultPrepTimeMin',
      'hoursJson',
      'holidayHoursJson',
      'payoutAccountJson',
    ];
    for (const field of allowedFields) {
      if (body[field] !== undefined) Object.assign(updates, { [field]: body[field] });
    }
    if (updates.lat !== undefined || updates.lng !== undefined) {
      const lat = updates.lat ?? vendor.lat;
      const lng = updates.lng ?? vendor.lng;
      if (!isPointInZone({ lat, lng }, loadZone())) {
        throw new BadRequestException('Vendor location must be inside the Cape Coast zone');
      }
    }
    if (updates.deliveryRadiusKm !== undefined && (!Number.isFinite(updates.deliveryRadiusKm) || updates.deliveryRadiusKm <= 0)) {
      throw new BadRequestException('Delivery radius must be positive');
    }
    if (updates.defaultPrepTimeMin !== undefined && (!Number.isInteger(updates.defaultPrepTimeMin) || updates.defaultPrepTimeMin < 0 || updates.defaultPrepTimeMin > 240)) {
      throw new BadRequestException('Default preparation time must be an integer from 0 to 240 minutes');
    }
    if (updates.maxConcurrentOrders !== undefined && (!Number.isInteger(updates.maxConcurrentOrders) || updates.maxConcurrentOrders < 1 || updates.maxConcurrentOrders > 1000)) {
      throw new BadRequestException('Maximum concurrent orders must be an integer from 1 to 1000');
    }
    Object.assign(vendor, updates);
    const saved = await this.vendors.save(vendor);
    await this.bus.publish(EVENTS.VENDOR_UPDATED, { vendorId: saved.id, name: saved.name });
    return saved;
  }

  async addItem(user: JwtPayload, vendorId: string, body: {
    name: string;
    category: string;
    pricePesewas: number;
    prepTimeMin?: number;
    unit?: string;
    stock?: number;
    prescriptionOnly?: boolean;
    description?: string;
    modifiers?: string[];
    addonGroups?: Record<string, unknown>[];
    sku?: string;
    expiryDate?: string;
    dosage?: string;
    turnaround?: string;
    dailyMarketPrice?: boolean;
    garmentType?: string;
    conditionJson?: Record<string, unknown>;
    dietaryTags?: string[];
  }): Promise<MenuItem> {
    const vendor = await this.ownedVendor(user, vendorId);
    if (body.name.trim().length < 2 || body.category.trim().length < 1) {
      throw new BadRequestException('Item name and category are required');
    }
    if (!Number.isInteger(body.pricePesewas) || body.pricePesewas < 0) {
      throw new BadRequestException('Item price must be a non-negative integer in pesewas');
    }
    if (body.stock !== undefined && (!Number.isInteger(body.stock) || body.stock < 0)) {
      throw new BadRequestException('Item stock must be a non-negative integer');
    }
    const addonGroups = normalizeAddonGroups(body.addonGroups);
    validateVerticalFields(vendor.vendorType, {
      ...body,
      addonGroups,
    });
    const item = await this.items.save(
      this.items.create({
        vendorId: vendor.id,
        name: body.name.trim(),
        category: body.category.trim(),
        pricePesewas: body.pricePesewas,
        prepTimeMin: body.prepTimeMin ?? vendor.defaultPrepTimeMin ?? 10,
        unit: body.unit?.trim() || 'each',
        stock: body.stock ?? null,
        prescriptionOnly: body.prescriptionOnly ?? false,
        description: body.description?.trim() || null,
        modifiers: body.modifiers ?? [],
        addonGroups,
        imageKey: null,
        imageContentType: null,
        available: false,
        sku: body.sku?.trim() || null,
        expiryDate: body.expiryDate ? parseExpiryDate(body.expiryDate) : null,
        dosage: body.dosage?.trim() || null,
        turnaround: body.turnaround?.trim() || null,
        dailyMarketPrice: body.dailyMarketPrice ?? false,
        garmentType: body.garmentType?.trim() || null,
        conditionJson: body.conditionJson ?? null,
        dietaryTags: body.dietaryTags ?? [],
      }),
    );
    return item;
  }

  async updateItem(user: JwtPayload, itemId: string, body: Partial<MenuItem>): Promise<MenuItem> {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    const vendor = await this.ownedVendor(user, item.vendorId);
    const updates: Partial<MenuItem> = {};
    const allowedFields: (keyof MenuItem)[] = [
      'name',
      'category',
      'pricePesewas',
      'prepTimeMin',
      'unit',
      'stock',
      'prescriptionOnly',
      'available',
      'modifiers',
      'addonGroups',
      'sku',
      'expiryDate',
      'dosage',
      'turnaround',
      'dailyMarketPrice',
      'garmentType',
      'conditionJson',
      'dietaryTags',
      'description',
    ];
    for (const field of allowedFields) {
      if (body[field] !== undefined) Object.assign(updates, { [field]: body[field] });
    }
    if (updates.pricePesewas !== undefined && (!Number.isInteger(updates.pricePesewas) || updates.pricePesewas < 0)) {
      throw new BadRequestException('Item price must be a non-negative integer in pesewas');
    }
    if (updates.addonGroups !== undefined) {
      updates.addonGroups = normalizeAddonGroups(updates.addonGroups as Record<string, unknown>[] | null | undefined);
    }
    const rawExpiry = (body as Record<string, unknown>).expiryDate;
    if (rawExpiry !== undefined) {
      updates.expiryDate = rawExpiry === null
        ? null
        : rawExpiry instanceof Date
          ? rawExpiry
          : parseExpiryDate(String(rawExpiry));
    }
    const verticalFields = new Set<keyof MenuItem>(['sku', 'stock', 'unit', 'expiryDate', 'dosage', 'prescriptionOnly', 'turnaround', 'garmentType', 'dailyMarketPrice']);
    const requireVerticalFields = Object.keys(updates).some((field) => verticalFields.has(field as keyof MenuItem));
    validateVerticalFields(vendor.vendorType, { ...item, ...updates }, { requireVerticalFields });
    Object.assign(item, updates);
    if (item.available && !item.imageKey) {
      throw new BadRequestException('A product photo is required before the item can be available');
    }
    const saved = await this.items.save(item);
    await this.bus.publish(EVENTS.ITEM_AVAILABILITY_CHANGED, { itemId: saved.id, vendorId: saved.vendorId, available: saved.available });
    return saved;
  }

  async uploadItemImage(user: JwtPayload, itemId: string, contentType: string, dataBase64: string): Promise<MenuItemDto> {
    const item = await this.items.findOne({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Item not found');
    await this.ownedVendor(user, item.vendorId);
    const normalizedContentType = contentType.trim().toLowerCase();
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(normalizedContentType)) {
      throw new BadRequestException('Product image must be JPEG, PNG, or WebP');
    }
    const encoded = dataBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
      throw new BadRequestException('Product image must be valid Base64');
    }
    const bytes = Buffer.from(encoded, 'base64');
    if (bytes.length === 0 || bytes.length > 10 * 1024 * 1024) {
      throw new BadRequestException('Product image must be between 1 byte and 10 MB');
    }
    const extension = normalizedContentType.includes('png') ? 'png' : normalizedContentType.includes('webp') ? 'webp' : 'jpg';
    const key = storageKeyFor('catalog-items', item.id, `image.${extension}`);
    await this.storage.putObject(key, bytes, normalizedContentType);
    item.imageKey = key;
    item.imageContentType = normalizedContentType;
    if (!item.available) item.available = true;
    const saved = await this.items.save(item);
    return this.toItemDto(saved);
  }

  async uploadVendorMedia(user: JwtPayload, vendorId: string, kind: 'logo' | 'banner', contentType: string, dataBase64: string): Promise<{ kind: string; mediaKey: string; imageUrl: string }> {
    const vendor = await this.ownedVendor(user, vendorId);
    const normalizedContentType = contentType.trim().toLowerCase();
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(normalizedContentType)) throw new BadRequestException('Store media must be JPEG, PNG, or WebP');
    const encoded = dataBase64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/i, '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) throw new BadRequestException('Store media must be valid Base64');
    const bytes = Buffer.from(encoded, 'base64');
    const limit = kind === 'logo' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (bytes.length === 0 || bytes.length > limit) throw new BadRequestException(`Store ${kind} must be between 1 byte and ${limit / (1024 * 1024)} MB`);
    const extension = normalizedContentType.includes('png') ? 'png' : normalizedContentType.includes('webp') ? 'webp' : 'jpg';
    const mediaKey = storageKeyFor('vendor-media', vendor.id, `${kind}.${extension}`);
    await this.storage.putObject(mediaKey, bytes, normalizedContentType);
    if (kind === 'logo') vendor.logoKey = mediaKey;
    else vendor.bannerKey = mediaKey;
    await this.vendors.save(vendor);
    return { kind, mediaKey, imageUrl: this.storage instanceof LocalStorageDriver ? `/api/catalog/media?key=${encodeURIComponent(mediaKey)}` : this.storage.getObjectUrl(mediaKey) };
  }

  async uploadStoryMedia(user: JwtPayload, vendorId: string, contentType: string, dataBase64: string): Promise<{ mediaKey: string; contentType: string }> {
    const vendor = await this.ownedVendor(user, vendorId);
    if (vendor.plan !== 'PREMIUM') throw new ForbiddenException('Stories are a Premium plan feature (doc §4)');
    const normalizedContentType = contentType.trim().toLowerCase();
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'].includes(normalizedContentType)) {
      throw new BadRequestException('Vendor stories support JPEG, PNG, WebP, MP4, MOV or WebM media');
    }
    const encoded = dataBase64.replace(/^data:[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+;base64,/i, '').replace(/\s/g, '');
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
      throw new BadRequestException('Story media must be valid Base64');
    }
    const bytes = Buffer.from(encoded, 'base64');
    const limit = normalizedContentType.startsWith('video/') ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
    if (bytes.length === 0 || bytes.length > limit) {
      throw new BadRequestException(`Story media must be between 1 byte and ${limit / (1024 * 1024)} MB`);
    }
    const extension = normalizedContentType.includes('png') ? 'png' : normalizedContentType.includes('webp') ? 'webp' : normalizedContentType === 'video/quicktime' ? 'mov' : normalizedContentType.startsWith('video/') ? 'mp4' : 'jpg';
    const mediaKey = storageKeyFor('catalog-stories', vendor.id, `story.${extension}`);
    await this.storage.putObject(mediaKey, bytes, normalizedContentType);
    return { mediaKey, contentType: normalizedContentType };
  }

  async readPublicVendorMedia(key: string): Promise<{ body: Buffer; contentType: string }> {
    if (!key.startsWith('vendor-media/') || key.includes('..') || key.includes('\\')) throw new NotFoundException('Store media not found');
    if (!(this.storage instanceof LocalStorageDriver)) throw new NotFoundException('Store media is served through cloud storage');
    try { return { body: this.storage.readObject(key), contentType: this.contentTypeForKey(key) }; } catch { throw new NotFoundException('Store media not found'); }
  }

  async readPublicStoryMedia(key: string): Promise<{ body: Buffer; contentType: string }> {
    if (!key.startsWith('catalog-stories/') || key.includes('..') || key.includes('\\')) {
      throw new NotFoundException('Story media not found');
    }
    if (!(this.storage instanceof LocalStorageDriver)) throw new NotFoundException('Story media is served through cloud storage');
    try {
      return { body: this.storage.readObject(key), contentType: this.contentTypeForKey(key) };
    } catch {
      throw new NotFoundException('Story media not found');
    }
  }

  async readPublicItemImage(key: string): Promise<{ body: Buffer; contentType: string }> {
    if (!key.startsWith('catalog-items/') || key.includes('..') || key.includes('\\')) {
      throw new NotFoundException('Image not found');
    }
    if (!(this.storage instanceof LocalStorageDriver)) {
      throw new NotFoundException('Image is served through cloud storage');
    }
    try {
      return { body: this.storage.readObject(key), contentType: this.contentTypeForKey(key) };
    } catch {
      throw new NotFoundException('Image not found');
    }
  }

  private contentTypeForKey(key: string): string {
    const lower = key.toLowerCase();
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.mp4')) return 'video/mp4';
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.webm')) return 'video/webm';
    return 'image/jpeg';
  }

  // ── helpers ───────────────────────────────────────────────────────

  private async findVendor(vendorId: string): Promise<Vendor> {
    const vendor = await this.vendors.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  private async ownedVendor(user: JwtPayload, vendorId: string): Promise<Vendor> {
    const vendor = await this.findVendor(vendorId);
    if (vendor.ownerUserId === user.sub || user.role === Role.ADMIN) return vendor;
    const staff = await this.staff.findOne({ where: { vendorId, userId: user.sub, active: true } });
    if (!staff) throw new ForbiddenException('Not your vendor');
    return vendor;
  }

  private async requireVendorOwner(user: JwtPayload, vendorId: string): Promise<Vendor> {
    const vendor = await this.findVendor(vendorId);
    if (vendor.ownerUserId !== user.sub && user.role !== Role.ADMIN) throw new ForbiddenException('Vendor owner or admin required');
    return vendor;
  }

  // ── doc §4 plans / stories ────────────────────────────────────────
  async setPlan(actorUserId: string, vendorId: string, plan: string, actorRole: Role = Role.VENDOR): Promise<Vendor> {
    const vendor = await this.vendors.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    // Admin-only: the plan sets the commission tier, so a vendor must not be able to
    // upgrade its own discount (audit F-SEC-5). The old owner-bypass is gone — the
    // route is @Roles(ADMIN) + vendor.plan.set, and this is the second lock.
    if (actorRole !== Role.ADMIN) {
      throw new ForbiddenException('Plan changes are admin-only');
    }
    vendor.plan = plan as never;
    await this.vendors.save(vendor);
    return vendor;
  }

  async createStory(actorUserId: string, vendorId: string, dto: { kind: string; mediaKey: string; muxPlaybackId?: string; caption?: string }, actorRole: Role = Role.VENDOR): Promise<VendorStory> {
    const vendor = await this.vendors.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    if (vendor.ownerUserId !== actorUserId && actorRole !== Role.ADMIN) throw new ForbiddenException('Not your vendor');
    // doc §4: stories = Premium plan only
    if (vendor.plan !== 'PREMIUM') throw new ForbiddenException('Stories are a Premium plan feature (doc §4)');
    if (!dto.mediaKey.startsWith(`catalog-stories/${vendorId}/`) || dto.mediaKey.includes('..') || dto.mediaKey.includes('\\')) {
      throw new BadRequestException('Story media must be uploaded through the Vendor story media endpoint');
    }
    if (dto.kind === 'VIDEO' && !dto.mediaKey.match(/\.(mp4|mov|webm)$/i)) throw new BadRequestException('Video stories require a video media key');
    if (dto.kind === 'IMAGE' && !dto.mediaKey.match(/\.(jpg|jpeg|png|webp)$/i)) throw new BadRequestException('Image stories require an image media key');
    const ttlHours = num(process.env.STORY_TTL_HOURS, 24);
    return this.stories.save(
      this.stories.create({
        vendorId,
        kind: dto.kind as never,
        mediaKey: dto.mediaKey,
        muxPlaybackId: dto.kind === 'VIDEO' ? dto.muxPlaybackId ?? null : null,
        caption: dto.caption ?? null,
        expiresAt: new Date(Date.now() + ttlHours * 3_600_000),
      }),
    );
  }

  async activeStories(): Promise<Array<VendorStory & { mediaUrl: string }>> {
    const stories = await this.stories.find({ where: { active: true, expiresAt: MoreThan(new Date()) }, order: { createdAt: 'DESC' }, take: 100 });
    return stories.map((story) => ({
      ...story,
      mediaUrl: this.storage instanceof LocalStorageDriver
        ? `/api/catalog/media?key=${encodeURIComponent(story.mediaKey)}`
        : this.storage.getObjectUrl(story.mediaKey),
    }));
  }

  async listPromotions(user: JwtPayload, vendorId: string): Promise<VendorPromotion[]> {
    await this.ownedVendor(user, vendorId);
    return this.promotions.find({ where: { vendorId }, order: { startsAt: 'DESC' }, take: 100 });
  }

  async publicActivePromotions(vendorId: string): Promise<Array<{
    id: string;
    vendorId: string;
    title: string;
    discountType: 'PERCENT' | 'FIXED';
    discountValue: number;
    minimumSubtotalPesewas: number;
    endsAt: string;
  }>> {
    const vendor = await this.vendors.findOne({ where: { id: vendorId } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    const rows = await this.activePromotions(vendorId);
    return rows.map((row) => ({
      id: row.id,
      vendorId: row.vendorId,
      title: row.title,
      discountType: row.discountType,
      discountValue: row.discountValue,
      minimumSubtotalPesewas: row.minimumSubtotalPesewas,
      endsAt: row.endsAt.toISOString(),
    }));
  }

  async activePromotions(vendorId: string, at = new Date()): Promise<VendorPromotion[]> {
    return this.promotions.createQueryBuilder('promotion')
      .where('promotion.vendorId = :vendorId', { vendorId })
      .andWhere('promotion.active = true')
      .andWhere('promotion.startsAt <= :at', { at })
      .andWhere('promotion.endsAt > :at', { at })
      .andWhere('(promotion.budgetPesewas IS NULL OR promotion.spentPesewas < promotion.budgetPesewas)')
      .andWhere('(promotion.redemptionLimit IS NULL OR promotion.redemptionsUsed < promotion.redemptionLimit)')
      .orderBy('promotion.discountValue', 'DESC')
      .getMany();
  }

  async redeemPromotion(promotionId: string, orderId: string, discountPesewas: number, customerId?: string): Promise<PromotionRedemption> {
    if (!Number.isInteger(discountPesewas) || discountPesewas <= 0) throw new BadRequestException('Promotion discount must be positive pesewas');
    return this.promotions.manager.transaction(async (manager) => {
      const promotionRepo = manager.getRepository(VendorPromotion);
      const redemptionRepo = manager.getRepository(PromotionRedemption);
      const existing = await redemptionRepo.findOne({ where: { orderId } });
      if (existing) return existing;
      const promotion = await promotionRepo.findOne({ where: { id: promotionId } });
      if (!promotion) throw new NotFoundException('Promotion not found');
      const now = new Date();
      if (!promotion.active || promotion.startsAt > now || promotion.endsAt <= now) throw new ConflictException('Promotion is no longer active');
      if (promotion.redemptionLimit !== null && promotion.redemptionsUsed >= promotion.redemptionLimit) throw new ConflictException('Promotion redemption limit has been reached');
      if (promotion.budgetPesewas !== null && promotion.spentPesewas + discountPesewas > promotion.budgetPesewas) throw new ConflictException('Promotion budget has been exhausted');
      // Atomic conditional increment: the budget and redemption limits are re-checked in the
      // WHERE clause, so two concurrent redemptions cannot both pass the read above. This also
      // avoids `pessimistic_write`, which SQLite does not support.
      const bumped = await promotionRepo.createQueryBuilder()
        .update(VendorPromotion)
        .set({ spentPesewas: () => 'spentPesewas + :amt', redemptionsUsed: () => 'redemptionsUsed + 1' })
        .where('id = :id AND active = :active', { id: promotionId, active: true })
        .andWhere('(redemptionLimit IS NULL OR redemptionsUsed < redemptionLimit)')
        .andWhere('(budgetPesewas IS NULL OR spentPesewas + :amt <= budgetPesewas)', { amt: discountPesewas })
        .execute();
      if (!bumped.affected) throw new ConflictException('Promotion budget has been exhausted');
      return redemptionRepo.save(redemptionRepo.create({ orderId, promotionId, customerId: customerId ?? null, discountPesewas, status: 'REDEEMED' }));
    });
  }

  async releasePromotion(orderId: string): Promise<void> {
    await this.promotions.manager.transaction(async (manager) => {
      const promotionRepo = manager.getRepository(VendorPromotion);
      const redemptionRepo = manager.getRepository(PromotionRedemption);
      const redemption = await redemptionRepo.findOne({ where: { orderId, status: 'REDEEMED' } });
      if (!redemption) return;
      // Atomic decrement, floored at zero in SQL so it can never go negative.
      await promotionRepo.createQueryBuilder()
        .update(VendorPromotion)
        .set({
          spentPesewas: () => 'MAX(0, spentPesewas - :amt)',
          redemptionsUsed: () => 'MAX(0, redemptionsUsed - 1)',
        })
        .where('id = :id', { id: redemption.promotionId, amt: redemption.discountPesewas })
        .execute();
      redemption.status = 'RELEASED';
      await redemptionRepo.save(redemption);
    });
  }

  async createPromotion(user: JwtPayload, vendorId: string, dto: { title: string; discountType: 'PERCENT' | 'FIXED'; discountValue: number; minimumSubtotalPesewas?: number; budgetPesewas?: number; redemptionLimit?: number; startsAt: string; endsAt: string; code?: string }): Promise<VendorPromotion> {
    await this.ownedVendor(user, vendorId);
    const title = dto.title.trim();
    if (title.length < 3 || title.length > 120) throw new BadRequestException('Promotion title must be between 3 and 120 characters');
    if (!['PERCENT', 'FIXED'].includes(dto.discountType)) throw new BadRequestException('Promotion discount type is invalid');
    if (!Number.isInteger(dto.discountValue) || dto.discountValue <= 0 || (dto.discountType === 'PERCENT' && dto.discountValue > 100)) {
      throw new BadRequestException(dto.discountType === 'PERCENT' ? 'Percentage discount must be an integer from 1 to 100' : 'Fixed discount must be a positive integer in pesewas');
    }
    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) throw new BadRequestException('Promotion dates must be valid and end after the start');
    const minimumSubtotalPesewas = dto.minimumSubtotalPesewas ?? 0;
    if (!Number.isInteger(minimumSubtotalPesewas) || minimumSubtotalPesewas < 0) throw new BadRequestException('Minimum subtotal must be a non-negative integer in pesewas');
    if (dto.budgetPesewas !== undefined && (!Number.isInteger(dto.budgetPesewas) || dto.budgetPesewas <= 0)) throw new BadRequestException('Promotion budget must be a positive integer in pesewas');
    if (dto.redemptionLimit !== undefined && (!Number.isInteger(dto.redemptionLimit) || dto.redemptionLimit <= 0)) throw new BadRequestException('Promotion redemption limit must be a positive integer');
    const code = dto.code?.trim().toUpperCase() || null;
    if (code) {
      const taken = await this.promotions.findOne({ where: { code } });
      if (taken) throw new ConflictException('That voucher code is already in use');
    }
    return this.promotions.save(this.promotions.create({ vendorId, title, discountType: dto.discountType, discountValue: dto.discountValue, minimumSubtotalPesewas, budgetPesewas: dto.budgetPesewas ?? null, redemptionLimit: dto.redemptionLimit ?? null, spentPesewas: 0, redemptionsUsed: 0, startsAt, endsAt, active: true, code }));
  }

  async promotionByCode(code: string): Promise<{ id: string; vendorId: string; title: string; code: string } | null> {
    const promotion = await this.promotions.findOne({ where: { code: code.trim().toUpperCase(), active: true } });
    if (!promotion) return null;
    const now = new Date();
    if (promotion.startsAt > now || promotion.endsAt <= now) return null;
    return { id: promotion.id, vendorId: promotion.vendorId, title: promotion.title, code: promotion.code! };
  }

  async listFavourites(customerId: string): Promise<VendorDto[]> {
    const rows = await this.favourites.find({ where: { customerId }, order: { createdAt: 'DESC' }, take: 100 });
    const vendors: VendorDto[] = [];
    for (const row of rows) {
      const vendor = await this.vendors.findOne({ where: { id: row.vendorId, approved: true } });
      if (vendor) vendors.push(this.toVendorDto(vendor));
    }
    return vendors;
  }

  async addFavourite(customerId: string, vendorId: string): Promise<VendorDto[]> {
    const vendor = await this.vendors.findOne({ where: { id: vendorId, approved: true } });
    if (!vendor) throw new NotFoundException('Vendor not found');
    const existing = await this.favourites.findOne({ where: { customerId, vendorId } });
    if (!existing) await this.favourites.save(this.favourites.create({ customerId, vendorId }));
    return this.listFavourites(customerId);
  }

  async removeFavourite(customerId: string, vendorId: string): Promise<VendorDto[]> {
    await this.favourites.delete({ customerId, vendorId });
    return this.listFavourites(customerId);
  }

  async listVouchers(customerId: string): Promise<Array<{ code: string; title: string; vendorId: string; promotionId: string; endsAt: string | null; active: boolean }>> {
    const rows = await this.vouchers.find({ where: { customerId }, order: { createdAt: 'DESC' }, take: 50 });
    const out: Array<{ code: string; title: string; vendorId: string; promotionId: string; endsAt: string | null; active: boolean }> = [];
    for (const row of rows) {
      const promo = await this.promotions.findOne({ where: { id: row.promotionId } });
      const now = new Date();
      const active = !!promo && promo.active && promo.startsAt <= now && promo.endsAt > now;
      out.push({
        code: row.code,
        title: promo?.title ?? row.code,
        vendorId: row.vendorId,
        promotionId: row.promotionId,
        endsAt: promo?.endsAt.toISOString() ?? null,
        active,
      });
    }
    return out;
  }

  async redeemVoucher(customerId: string, code: string): Promise<{ code: string; title: string; vendorId: string; promotionId: string; endsAt: string | null; active: boolean }> {
    const found = await this.promotionByCode(code);
    if (!found) throw new NotFoundException('That voucher code is not an active promotion');
    const existing = await this.vouchers.findOne({ where: { customerId, code: found.code } });
    if (!existing) await this.vouchers.save(this.vouchers.create({ customerId, code: found.code, promotionId: found.id, vendorId: found.vendorId }));
    const promo = await this.promotions.findOne({ where: { id: found.id } });
    return { code: found.code, title: found.title, vendorId: found.vendorId, promotionId: found.id, endsAt: promo?.endsAt.toISOString() ?? null, active: true };
  }

  async promotionAnalytics(user: JwtPayload, vendorId: string, promotionId: string): Promise<{ promotionId: string; redemptions: number; discountPesewas: number; uniqueCustomers: number }> {
    await this.ownedVendor(user, vendorId);
    const promotion = await this.promotions.findOne({ where: { id: promotionId, vendorId } });
    if (!promotion) throw new NotFoundException('Promotion not found');
    const rows = await this.redemptions.find({ where: { promotionId, status: 'REDEEMED' } });
    return { promotionId, redemptions: rows.length, discountPesewas: rows.reduce((sum, row) => sum + row.discountPesewas, 0), uniqueCustomers: new Set(rows.map((row) => row.customerId).filter(Boolean)).size };
  }

  async setPromotionActive(user: JwtPayload, vendorId: string, promotionId: string, active: boolean): Promise<VendorPromotion> {
    await this.ownedVendor(user, vendorId);
    const promotion = await this.promotions.findOne({ where: { id: promotionId, vendorId } });
    if (!promotion) throw new NotFoundException('Promotion not found');
    promotion.active = active;
    return this.promotions.save(promotion);
  }

  async listReviews(user: JwtPayload, vendorId: string): Promise<VendorReview[]> {
    await this.ownedVendor(user, vendorId);
    return this.reviews.find({ where: { vendorId }, order: { createdAt: 'DESC' }, take: 100 });
  }

  async createReview(user: JwtPayload, dto: { orderId: string; rating: number; comment?: string }): Promise<VendorReview> {
    if (user.role !== Role.CUSTOMER) throw new ForbiddenException('Customer role required');
    const existing = await this.reviews.findOne({ where: { orderId: dto.orderId } });
    if (existing) throw new ConflictException('A review already exists for this order');
    const response = await internalFetch(`${serviceUrl('order')}/internal/orders/${dto.orderId}`);
    if (!response.ok) throw new NotFoundException('Order not found');
    const order = (await response.json()) as { status: string; customerId: string; vendorId: string };
    if (order.customerId !== user.sub) throw new ForbiddenException('Not your order');
    if (order.status !== 'DELIVERED') throw new ConflictException('Reviews can only be submitted after delivery');
    if (!Number.isInteger(dto.rating) || dto.rating < 1 || dto.rating > 5) throw new BadRequestException('Rating must be from 1 to 5');
    return this.reviews.save(this.reviews.create({ orderId: dto.orderId, vendorId: order.vendorId, customerId: user.sub, rating: dto.rating, comment: dto.comment?.trim() || null, vendorResponse: null, respondedAt: null }));
  }

  async respondToReview(user: JwtPayload, reviewId: string, responseText: string): Promise<VendorReview> {
    const review = await this.reviews.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    await this.ownedVendor(user, review.vendorId);
    const response = responseText.trim();
    if (response.length < 1 || response.length > 1000) throw new BadRequestException('Review response must be between 1 and 1000 characters');
    review.vendorResponse = response;
    review.respondedAt = new Date();
    return this.reviews.save(review);
  }

  private async findVendorStrict(id: string): Promise<Vendor> {
    const v = await this.vendors.findOne({ where: { id } });
    if (!v) throw new NotFoundException('Vendor not found');
    return v;
  }

  private async toVendorDtoWithLocations(v: Vendor): Promise<VendorDto> {
    const dto = this.toVendorDto(v);
    const locations = await this.locations.find({ where: { vendorId: v.id, active: true }, order: { createdAt: 'ASC' } });
    dto.locations = locations.map((location): VendorLocationDto => ({
      id: location.id,
      vendorId: location.vendorId,
      name: location.name,
      address: location.address,
      lat: location.lat,
      lng: location.lng,
      deliveryRadiusKm: location.deliveryRadiusKm,
      accepting: location.accepting,
      active: location.active,
    }));
    return dto;
  }

  private toVendorTaxProfile(v: Vendor): { id: string; taxResidentStatus: ResidentStatus; taxIdentificationNumber: string | null; taxProfileJson: Record<string, unknown> | null } {
    return {
      id: v.id,
      taxResidentStatus: v.taxResidentStatus,
      taxIdentificationNumber: v.taxIdentificationNumber,
      taxProfileJson: v.taxProfileJson,
    };
  }

  private toVendorDto(v: Vendor): VendorDto {
    return {
      id: v.id,
      name: v.name,
      vendorType: v.vendorType,
      approved: v.approved,
      publicId: v.publicId,
      logoUrl: v.logoKey ? (this.storage instanceof LocalStorageDriver ? `/api/catalog/media?key=${encodeURIComponent(v.logoKey)}` : this.storage.getObjectUrl(v.logoKey)) : null,
      bannerUrl: v.bannerKey ? (this.storage instanceof LocalStorageDriver ? `/api/catalog/media?key=${encodeURIComponent(v.bannerKey)}` : this.storage.getObjectUrl(v.bannerKey)) : null,
      lat: v.lat,
      lng: v.lng,
      deliveryRadiusKm: v.deliveryRadiusKm,
      acceptsCod: v.acceptsCod,
      accepting: v.accepting,
      defaultPrepTimeMin: v.defaultPrepTimeMin,
      maxConcurrentOrders: v.maxConcurrentOrders,
      openNow: isOpenNow(v.hoursJson, new Date(), v.holidayHoursJson),
      hoursJson: v.hoursJson,
      holidayHoursJson: v.holidayHoursJson,
      plan: v.plan,
      suspendUntil: v.suspendUntil?.toISOString() ?? null,
    };
  }

  private toItemDto(i: MenuItem): MenuItemDto {
    return {
      id: i.id,
      vendorId: i.vendorId,
      name: i.name,
      pricePesewas: i.pricePesewas,
      prepTimeMin: i.prepTimeMin,
      available: i.available,
      unit: i.unit,
      stock: i.stock,
      prescriptionOnly: i.prescriptionOnly,
      modifiers: i.modifiers ?? [],
      addonGroups: i.addonGroups ?? null,
      imageKey: i.imageKey ?? null,
      imageUrl: i.imageKey
        ? this.storage instanceof LocalStorageDriver
          ? `/api/catalog/media?key=${encodeURIComponent(i.imageKey)}`
          : this.storage.getObjectUrl(i.imageKey)
        : null,
      imageContentType: i.imageContentType ?? null,
      sku: i.sku ?? null,
      expiryDate: i.expiryDate?.toISOString() ?? null,
      dosage: i.dosage ?? null,
      turnaround: i.turnaround ?? null,
      dailyMarketPrice: i.dailyMarketPrice,
      garmentType: i.garmentType ?? null,
      conditionJson: i.conditionJson ?? null,
      dietaryTags: i.dietaryTags ?? [],
      description: i.description ?? undefined,
      category: i.category,
    };
  }
}

export function calculateVendorAnalytics(
  orders: VendorAnalyticsOrder[],
  start: Date,
  vendorId: string,
  period: string,
): Record<string, unknown> {
  const filtered = orders.filter((order) => {
    const timestamp = new Date(order.timeline?.[0]?.at ?? 0);
    return !Number.isNaN(timestamp.getTime()) && timestamp >= start;
  });
  const completedOrders = filtered.filter((order) => order.status === 'DELIVERED');
  const cancelled = filtered.filter((order) => ['CANCELLED', 'REJECTED', 'FAILED_DELIVERY'].includes(order.status)).length;
  const revenuePesewas = completedOrders.reduce((sum, order) => sum + order.totalPesewas, 0);
  const byDay = new Map<string, number>();
  const itemCounts = new Map<string, { name: string; count: number }>();
  const customers = new Set<string>();
  for (const order of completedOrders) {
    const date = order.timeline?.[0]?.at?.slice(0, 10) ?? 'unknown';
    byDay.set(date, (byDay.get(date) ?? 0) + order.totalPesewas);
    if (order.customer?.id) customers.add(order.customer.id);
    for (const item of order.items ?? []) {
      const current = itemCounts.get(item.itemId) ?? { name: item.name, count: 0 };
      current.count += item.qty;
      itemCounts.set(item.itemId, current);
    }
  }
  const avgPrepTime = completedOrders.length === 0
    ? 0
    : Math.round(completedOrders.reduce((sum, order) => sum + order.prepTimeMin, 0) / completedOrders.length);
  return {
    vendorId,
    period,
    orders: {
      total: filtered.length,
      completed: completedOrders.length,
      cancelled,
      avgValuePesewas: completedOrders.length ? Math.round(revenuePesewas / completedOrders.length) : 0,
    },
    revenue: {
      totalPesewas: revenuePesewas,
      byDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, amountPesewas]) => ({ date, amountPesewas })),
    },
    items: { topSelling: [...itemCounts.values()].sort((a, b) => b.count - a.count).slice(0, 10) },
    performance: { avgPrepTimeMin: avgPrepTime, acceptanceRate: filtered.length ? Math.round(((filtered.length - cancelled) / filtered.length) * 100) : 0 },
    customers: { total: customers.size },
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function num(v: string | undefined, d: number): number { const n = Number(v); return Number.isFinite(n) && v !== undefined && v !== '' ? n : d; }

function parseExpiryDate(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new BadRequestException('Expiry date must be a valid ISO date');
  return parsed;
}

/**
 * Canonicalize the shared catalogue option contract before it is persisted.
 * IDs are deliberately required: cart/order snapshots use them to prevent a
 * client from changing an option's label or price at checkout.
 */
export function normalizeAddonGroups(value: Record<string, unknown>[] | null | undefined): Record<string, unknown>[] | null {
  if (value === undefined || value === null) return null;
  validateAddonGroups(value);
  return value.map((rawGroup) => {
    const group = rawGroup as Record<string, unknown>;
    const options = (group.options as Record<string, unknown>[]).map((rawOption) => {
      const option = rawOption as Record<string, unknown>;
      return {
        id: String(option.id),
        name: String(option.name).trim(),
        priceAdjustmentPesewas: option.priceAdjustmentPesewas === undefined ? 0 : option.priceAdjustmentPesewas,
      };
    });
    const required = group.required === true;
    const minSelections = group.minSelections === undefined ? (required ? 1 : 0) : group.minSelections;
    const maxSelections = group.maxSelections === undefined ? 1 : group.maxSelections;
    return {
      id: String(group.id),
      name: String(group.name).trim(),
      required,
      minSelections,
      maxSelections,
      options,
    };
  });
}

export function validateAddonGroups(value: Record<string, unknown>[] | null | undefined): void {
  if (value === undefined || value === null) return;
  if (!Array.isArray(value)) throw new BadRequestException('addonGroups must be an array');
  const groupIds = new Set<string>();
  for (const rawGroup of value) {
    if (!rawGroup || typeof rawGroup !== 'object' || Array.isArray(rawGroup)) {
      throw new BadRequestException('Each addon group must be an object');
    }
    const group = rawGroup as Record<string, unknown>;
    const id = group.id;
    const name = group.name;
    const options = group.options;
    if (typeof id !== 'string' || id.trim().length < 1 || typeof name !== 'string' || name.trim().length < 1 || !Array.isArray(options) || options.length === 0) {
      throw new BadRequestException('Each addon group requires a unique id, name, and at least one option');
    }
    if (groupIds.has(id)) throw new BadRequestException(`Duplicate addon group id: ${id}`);
    groupIds.add(id);

    const required = group.required;
    if (required !== undefined && typeof required !== 'boolean') {
      throw new BadRequestException('Addon group required must be a boolean');
    }
    const minSelections = group.minSelections === undefined || group.minSelections === null ? (required === true ? 1 : 0) : Number(group.minSelections);
    const maxSelections = group.maxSelections === undefined || group.maxSelections === null ? 1 : Number(group.maxSelections);
    if (!Number.isInteger(minSelections) || !Number.isInteger(maxSelections) || minSelections < 0 || (required === true && minSelections < 1) || maxSelections < 1 || minSelections > maxSelections || maxSelections > options.length) {
      throw new BadRequestException(`Invalid selection limits for addon group ${id}`);
    }

    const optionIds = new Set<string>();
    for (const rawOption of options) {
      if (!rawOption || typeof rawOption !== 'object' || Array.isArray(rawOption)) {
        throw new BadRequestException('Each addon option must be an object');
      }
      const option = rawOption as Record<string, unknown>;
      const optionId = option.id;
      const optionName = option.name;
      const price = option.priceAdjustmentPesewas === undefined ? 0 : option.priceAdjustmentPesewas;
      if (typeof optionId !== 'string' || optionId.trim().length < 1 || typeof optionName !== 'string' || optionName.trim().length < 1 || !Number.isInteger(price) || (price as number) < 0) {
        throw new BadRequestException('Addon options require a unique id, name, and non-negative pesewa adjustment');
      }
      if (optionIds.has(optionId)) throw new BadRequestException(`Duplicate addon option id: ${optionId}`);
      optionIds.add(optionId);
    }
  }
}

export function validateVerticalFields(vendorType: string, value: Record<string, unknown>, options: { requireVerticalFields?: boolean } = {}): void {
  const type = vendorType.toUpperCase();
  if (type === 'GROCERIES') {
    // Flutter config id; treat as GROCERY.
  } else if (!isCatalogueVendorType(type)) {
    throw new BadRequestException('Unknown vendor service');
  }
  const requireVerticalFields = options.requireVerticalFields !== false;
  const prepTime = value.prepTimeMin;
  if (prepTime !== undefined && (!Number.isInteger(prepTime) || (prepTime as number) < 0)) {
    throw new BadRequestException('Preparation/turnaround time must be a non-negative integer');
  }
  if (value.stock !== undefined && value.stock !== null && (!Number.isInteger(value.stock) || (value.stock as number) < 0)) {
    throw new BadRequestException('Item stock must be a non-negative integer');
  }
  if (value.available !== undefined && typeof value.available !== 'boolean') {
    throw new BadRequestException('Item availability must be a boolean');
  }
  if (value.expiryDate !== undefined && value.expiryDate !== null) {
    const expiry = value.expiryDate instanceof Date ? value.expiryDate : new Date(String(value.expiryDate));
    if (Number.isNaN(expiry.getTime())) throw new BadRequestException('Expiry date must be a valid ISO date');
  }

  const requiresStockAndSku = type === 'GROCERY' || type === 'GROCERIES' || type === 'SHOP' || type === 'PHARMACY';
  if (requireVerticalFields && requiresStockAndSku) {
    if (typeof value.sku !== 'string' || value.sku.trim().length === 0) {
      throw new BadRequestException(`${type} items require a SKU/barcode`);
    }
    if (value.stock === undefined || value.stock === null) {
      throw new BadRequestException(`${type} items require stock quantity`);
    }
    if (typeof value.unit !== 'string' || value.unit.trim().length === 0) {
      throw new BadRequestException(`${type} items require a unit`);
    }
  }
  if (requireVerticalFields && type === 'PHARMACY') {
    if (value.expiryDate === undefined || value.expiryDate === null) {
      throw new BadRequestException('Pharmacy items require an expiry date');
    }
    if (value.prescriptionOnly === true && (typeof value.dosage !== 'string' || value.dosage.trim().length === 0)) {
      throw new BadRequestException('Prescription pharmacy items require dosage/strength information');
    }
  }
  if (requireVerticalFields && type === 'MARKET') {
    if (typeof value.unit !== 'string' || value.unit.trim().length === 0) {
      throw new BadRequestException('Market items require a weight or selling unit');
    }
    if (value.dailyMarketPrice !== undefined && typeof value.dailyMarketPrice !== 'boolean') {
      throw new BadRequestException('Market daily price flag must be a boolean');
    }
  }
  if (requireVerticalFields && type === 'LAUNDRY') {
    if (typeof value.turnaround !== 'string' || value.turnaround.trim().length === 0) {
      throw new BadRequestException('Laundry items require a turnaround/service duration');
    }
    if (typeof value.garmentType !== 'string' || value.garmentType.trim().length === 0) {
      throw new BadRequestException('Laundry items require a garment/service type');
    }
    if (typeof value.unit !== 'string' || value.unit.trim().length === 0) {
      throw new BadRequestException('Laundry services require a unit or pricing basis');
    }
  }
}
