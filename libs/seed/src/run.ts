/** Seed runner — fully seeds dev/staging environments (G35). Idempotent: safe to re-run. */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { formatRiderIdentifier, RiderIdentifierStatus, RiderStatus, Role, RiderCodTier, RiderCodStatus, ErrandTrustTier, OrderStatus, ApplicationStatus, SmileIdStatus, PaymentMethod, VendorSettlementStatus, WithdrawalStatus, DisputeReason } from '@ore/contracts';
import { loadEnv } from '@ore/config';
import { dataSourceOptions, ensureSchema, EntityClassOrSchema } from '@ore/db';

// Import All Entities
import { User, IdCounter as AuthIdCounter } from '../../../apps/auth/src/entities';
import { Vendor, MenuItem, VendorStaff } from '../../../apps/catalog/src/entities';
import { Rider, RiderIdentifierAudit, RiderIdentifierSequence } from '../../../apps/dispatch/src/entities';
import { IdCounter as OnboardIdCounter, Application, Document, AuditLog, SmileVerificationJob } from '../../../apps/onboarding/src/entities';
import { Order, OrderItem } from '../../../apps/order/src/entities';
import { LedgerEntry, VendorSettlement, RiderWithdrawal, Dispute, CustomerCredit } from '../../../apps/ledger/src/entities';

// Ghana Localized Seeding Mock Data
import { SEED_VENDORS } from './data/vendors';
import { SEED_ADMINS, SEED_CUSTOMERS, SEED_RIDERS } from './data/people';

function saveMockSvg(appId: string, docId: string, docKind: string, name: string) {
  const dir = path.join('.storage', 'onboarding-documents', appId);
  fs.mkdirSync(dir, { recursive: true });
  
  let svgContent = '';
  if (docKind === 'national_id') {
    svgContent = `
<svg width="400" height="250" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="15" fill="#f8fafc" stroke="#cbd5e1" stroke-width="3"/>
  <rect width="100%" height="45" rx="15" fill="#0f172a"/>
  <text x="20" y="28" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">REPUBLIC OF GHANA - NATIONAL ID CARD</text>
  <text x="20" y="80" fill="#64748b" font-family="sans-serif" font-size="10" font-weight="bold">NAME OF HOLDER</text>
  <text x="20" y="100" fill="#0f172a" font-family="sans-serif" font-size="14" font-weight="bold">${name}</text>
  <text x="20" y="135" fill="#64748b" font-family="sans-serif" font-size="10" font-weight="bold">DOCUMENT NUMBER</text>
  <text x="20" y="155" fill="#0f172a" font-family="monospace" font-size="14" font-weight="bold">GHA-102938475-6</text>
  <text x="20" y="190" fill="#64748b" font-family="sans-serif" font-size="10" font-weight="bold">DATE OF BIRTH</text>
  <text x="20" y="210" fill="#0f172a" font-family="sans-serif" font-size="12" font-weight="semibold">12 APR 1995</text>
  <circle cx="320" cy="140" r="45" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="2"/>
  <path d="M320,115 C310,115 300,125 300,135 C300,145 310,155 320,155 C330,155 340,145 340,135 C340,125 330,115 320,115 Z" fill="#94a3b8"/>
  <path d="M290,180 C290,165 300,155 320,155 C340,155 350,165 350,180 Z" fill="#64748b"/>
</svg>
`;
  } else if (docKind === 'drivers_license') {
    svgContent = `
<svg width="400" height="250" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="15" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="3"/>
  <rect width="100%" height="45" rx="15" fill="#15803d"/>
  <text x="20" y="28" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">GHANA DRIVER'S LICENSE</text>
  <text x="20" y="80" fill="#166534" font-family="sans-serif" font-size="10" font-weight="bold">OPERATOR NAME</text>
  <text x="20" y="100" fill="#14532d" font-family="sans-serif" font-size="14" font-weight="bold">${name}</text>
  <text x="20" y="135" fill="#166534" font-family="sans-serif" font-size="10" font-weight="bold">LICENSE CODE & EXPIRY</text>
  <text x="20" y="155" fill="#14532d" font-family="monospace" font-size="14" font-weight="bold">CLASS B · EXP 12/2028</text>
  <text x="20" y="190" fill="#166534" font-family="sans-serif" font-size="10" font-weight="bold">VEHICLE TIER ELIGIBILITY</text>
  <text x="20" y="210" fill="#14532d" font-family="sans-serif" font-size="12" font-weight="semibold">MOTORBIKE / LIGHT CAR</text>
</svg>
`;
  } else {
    svgContent = `
<svg width="400" height="250" viewBox="0 0 400 250" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="15" fill="#fef2f2" stroke="#fecaca" stroke-width="3"/>
  <rect width="100%" height="45" rx="15" fill="#b91c1c"/>
  <text x="20" y="28" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">OFFICIAL BUSINESS REGISTRATION</text>
  <text x="20" y="80" fill="#991b1b" font-family="sans-serif" font-size="10" font-weight="bold">ENTERPRISE NAME</text>
  <text x="20" y="100" fill="#7f1d1d" font-family="sans-serif" font-size="14" font-weight="bold">${name}</text>
  <text x="20" y="135" fill="#991b1b" font-family="sans-serif" font-size="10" font-weight="bold">REGISTRAR GENERAL CODE</text>
  <text x="20" y="155" fill="#7f1d1d" font-family="monospace" font-size="14" font-weight="bold">RGC-8874653-B</text>
</svg>
`;
  }
  
  fs.writeFileSync(path.join(dir, docId), svgContent.trim());
}

async function main(): Promise<Record<string, number>> {
  const env = loadEnv();
  console.log(`Starting massive local seeding stack... Active DB mode: ${env.dbType}`);

  // One connection per service, built by the SAME factory the services use.
  //
  // These were six hardcoded `type: 'sqlite'` datasources pointing at `./ore-<service>.sqlite`.
  // They ignored DB_TYPE and DATABASE_URL completely, so seeding a Postgres environment printed
  // "Massive Local Seeding Complete!" and wrote every row into local sqlite files in the current
  // working directory. Nothing reached the database, and the exit code was 0 — a staging box
  // could be seeded a dozen times and stay empty.
  //
  // `dataSourceOptions` keeps sqlite behaviour byte-for-byte identical (same filenames, same
  // `synchronize: true`) and makes Postgres write to the service's own schema.
  const connect = async (schema: string, entities: EntityClassOrSchema[]) => {
    const ds = new DataSource(dataSourceOptions({ schema, entities }));
    if (ds.options.type === "postgres") { const { Client } = require("pg"); const c = new Client({ connectionString: ds.options.url }); await c.connect(); await ensureSchema(c, schema); await c.end(); }
    await ds.initialize();
    // Migrations own the schema in production; seeding a fresh Postgres before the services have
    // ever booted should not fail on a missing namespace.
    
    return ds;
  };

  const authDs = await connect('auth', [User, AuthIdCounter]);
  const catalogDs = await connect('catalog', [Vendor, MenuItem, VendorStaff]);
  const dispatchDs = await connect('dispatch', [Rider, RiderIdentifierSequence, RiderIdentifierAudit]);
  const onboardDs = await connect('onboarding', [Application, Document, OnboardIdCounter, AuditLog, SmileVerificationJob]);
  const orderDs = await connect('order', [Order, OrderItem]);
  const ledgerDs = await connect('ledger', [LedgerEntry, VendorSettlement, RiderWithdrawal, Dispute, CustomerCredit]);

  const users = authDs.getRepository(User);
  const vendors = catalogDs.getRepository(Vendor);
  const vendorStaff = catalogDs.getRepository(VendorStaff);
  const items = catalogDs.getRepository(MenuItem);
  const riders = dispatchDs.getRepository(Rider);
  const riderIdentifierSequences = dispatchDs.getRepository(RiderIdentifierSequence);
  const riderIdentifierAudits = dispatchDs.getRepository(RiderIdentifierAudit);
  const applications = onboardDs.getRepository(Application);
  const documents = onboardDs.getRepository(Document);
  const auditLogs = onboardDs.getRepository(AuditLog);
  const smileJobs = onboardDs.getRepository(SmileVerificationJob);
  const orders = orderDs.getRepository(Order);
  const orderItems = orderDs.getRepository(OrderItem);
  const ledgerEntries = ledgerDs.getRepository(LedgerEntry);
  const vendorSettlements = ledgerDs.getRepository(VendorSettlement);
  const riderWithdrawals = ledgerDs.getRepository(RiderWithdrawal);
  const disputes = ledgerDs.getRepository(Dispute);
  const customerCredits = ledgerDs.getRepository(CustomerCredit);

  console.log('Seeding administrative users...');
  const userMap = new Map<string, string>();
  
  // Seed Admins with specific RBAC subroles
  const rbacAdmins = [
    { email: 'admin@ore.delivery', phone: '233540000001', name: 'Ore Super Admin', subrole: 'super_admin' },
    { email: 'compliance@ore.delivery', phone: '233540000002', name: 'Kofi Mensah (Compliance)', subrole: 'compliance' },
    { email: 'operations@ore.delivery', phone: '233540000003', name: 'Sarah Animah (Ops)', subrole: 'operations' },
    { email: 'finance@ore.delivery', phone: '233540000004', name: 'Emmanuel Osei (Finance)', subrole: 'finance' },
    { email: 'support@ore.delivery', phone: '233540000005', name: 'Adwoa Boateng (Support)', subrole: 'support' },
  ];

  for (const a of rbacAdmins) {
    let u = await users.findOne({ where: { email: a.email } });
    if (!u) {
      u = await users.save(users.create({
        email: a.email,
        phone: a.phone,
        role: Role.ADMIN,
        roles: [Role.ADMIN, a.subrole],
        verified: true,
        name: a.name,
        publicId: `ORA-${a.subrole.toUpperCase().slice(0, 5)}`,
        passwordHash: 'scrypt:cf3757963b6fd2eef2d65feb5b62621d2193bbbfba91a09:774a3f12bb0e7681c2be0b4f884a44f8', // matches OreDev!327665353f73
        totpSecret: '6GZSFGKNVLMVENJ5',
      }));
    }
    userMap.set(a.phone, u.id);
  }

  // Seed Customers
  for (const c of SEED_CUSTOMERS) {
    let u = await users.findOne({ where: { phone: c.phone } });
    if (!u) {
      u = await users.save(users.create({
        phone: c.phone,
        role: Role.CUSTOMER,
        roles: [Role.CUSTOMER],
        verified: true,
        name: c.name,
        publicId: `ORC-2026-${String(SEED_CUSTOMERS.indexOf(c) + 1).padStart(6, '0')}`,
      }));
    }
    userMap.set(c.phone, u.id);
  }

  // Seed Riders
  for (const r of SEED_RIDERS) {
    let u = await users.findOne({ where: { phone: r.phone } });
    const accountPublicId = `ORC-2026-${String(SEED_CUSTOMERS.length + SEED_RIDERS.indexOf(r) + 1).padStart(6, '0')}`;
    if (!u) {
      u = await users.save(users.create({
        phone: r.phone,
        role: Role.RIDER,
        roles: [Role.RIDER],
        verified: true,
        name: r.name,
        publicId: accountPublicId,
      }));
    } else if (u.publicId?.startsWith('ORR-')) {
      u.publicId = accountPublicId;
      await users.save(u);
    }
    userMap.set(r.phone, u.id);
  }

  console.log('Seeding active courier fleet profiles...');
  for (const r of SEED_RIDERS) {
    const userId = userMap.get(r.phone)!;
    let riderProfile = await riders.findOne({ where: { userId } });
    
    // Vary limits to trigger COD exposures warning cards
    const codBlocked = SEED_RIDERS.indexOf(r) % 4 === 1;
    const codStatus = SEED_RIDERS.indexOf(r) % 4 === 1 
      ? RiderCodStatus.SUSPENDED 
      : SEED_RIDERS.indexOf(r) % 4 === 2 
      ? RiderCodStatus.WARNING 
      : RiderCodStatus.CLEAR;
    
    const codTier = SEED_RIDERS.indexOf(r) % 3 === 0 
      ? RiderCodTier.SENIOR 
      : SEED_RIDERS.indexOf(r) % 3 === 1 
      ? RiderCodTier.EXPERIENCED 
      : RiderCodTier.NEW;
    const riderSequence = SEED_RIDERS.indexOf(r) + 1;
    const riderIdentifier = formatRiderIdentifier('CC', 2026, riderSequence);

    if (!riderProfile) {
      await riders.save(riders.create({
        userId,
        name: r.name,
        phone: r.phone,
        vehicle: r.vehicle,
        licensePlate: `CR-200-${String(SEED_RIDERS.indexOf(r) + 10).padStart(2, '0')}`,
        status: SEED_RIDERS.indexOf(r) % 2 === 0 ? RiderStatus.AVAILABLE : RiderStatus.OFFLINE,
        verified: true,
        riderIdentifier,
        cityId: 'cape-coast',
        cityCode: 'CC',
        approvalYear: 2026,
        sequenceNumber: riderSequence,
        approvedAt: new Date('2026-01-01T00:00:00Z'),
        identifierStatus: RiderIdentifierStatus.ACTIVE,
        lat: r.lat,
        lng: r.lng,
        codBlocked,
        codStatus,
        codTier,
        completedDeliveries: 12 + SEED_RIDERS.indexOf(r) * 15,
        rating: 4.5 + (SEED_RIDERS.indexOf(r) % 5) * 0.1,
        reliabilityScore: 0.9 + (SEED_RIDERS.indexOf(r) % 10) * 0.01,
        errandTrustTier: ErrandTrustTier.VERIFIED,
        completedErrands: 5 + SEED_RIDERS.indexOf(r) * 2,
      }));
    } else if (!riderProfile.riderIdentifier) {
      riderProfile.riderIdentifier = riderIdentifier;
      riderProfile.cityId = 'cape-coast';
      riderProfile.cityCode = 'CC';
      riderProfile.approvalYear = 2026;
      riderProfile.sequenceNumber = riderSequence;
      riderProfile.approvedAt = riderProfile.approvedAt ?? new Date('2026-01-01T00:00:00Z');
      riderProfile.identifierStatus = RiderIdentifierStatus.ACTIVE;
      await riders.save(riderProfile);
    }
  }

  await riderIdentifierSequences.save(riderIdentifierSequences.create({
    cityCode: 'CC',
    approvalYear: 2026,
    seq: SEED_RIDERS.length,
  }));
  for (const r of SEED_RIDERS) {
    const userId = userMap.get(r.phone)!;
    const riderProfile = await riders.findOne({ where: { userId } });
    if (riderProfile?.riderIdentifier) {
      const exists = await riderIdentifierAudits.findOne({ where: { riderId: riderProfile.id, eventType: 'CREATED' } });
      if (!exists) {
        await riderIdentifierAudits.save(riderIdentifierAudits.create({
          riderId: riderProfile.id,
          eventType: 'CREATED',
          identifier: riderProfile.riderIdentifier,
          previousIdentifier: null,
          cityId: riderProfile.cityId,
          cityCode: riderProfile.cityCode,
          approvalYear: riderProfile.approvalYear,
          sequenceNumber: riderProfile.sequenceNumber,
          previousCityId: null,
          previousCityCode: null,
          previousApprovalYear: null,
          previousSequenceNumber: null,
          reason: 'Seeded approved Rider ID',
          actorId: 'seed',
          actorRole: 'system',
          approvalReference: 'seed:approved-riders',
          metadataJson: { seed: true },
        }));
      }
    }
  }

  console.log('Seeding vendor owner accounts...');
  // Every vendor needs a real owner user with the VENDOR role — the vendor app,
  // order accept/ready, and catalog staff routes all require it. Previously all
  // vendors were mock-linked to rider #1, which left NO usable vendor account in a
  // fresh environment.
  const vendorOwnerMap = new Map<string, string>();
  for (const v of SEED_VENDORS) {
    const phone = `2335600000${String(SEED_VENDORS.indexOf(v) + 1).padStart(2, '0')}`;
    let u = await users.findOne({ where: { phone } });
    if (!u) {
      u = await users.save(users.create({
        phone,
        role: Role.VENDOR,
        roles: [Role.VENDOR],
        verified: true,
        name: `${v.name} Owner`,
        publicId: `ORV-O-${String(SEED_VENDORS.indexOf(v) + 1).padStart(3, '0')}`,
      }));
    }
    vendorOwnerMap.set(v.name, u.id);
  }

  console.log('Seeding merchant stores & catalogs...');
  const foodPhotos = [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=500&auto=format&fit=crop&q=80',
  ];

  for (const v of SEED_VENDORS) {
    let vendor = await vendors.findOne({ where: { name: v.name } });
    if (!vendor) {
      vendor = await vendors.save(vendors.create({
        ownerUserId: vendorOwnerMap.get(v.name)!,
        name: v.name,
        vendorType: v.vendorType as any,
        approved: true,
        publicId: `ORV-2026-${String(SEED_VENDORS.indexOf(v) + 1).padStart(4, '0')}`,
        lat: v.lat,
        lng: v.lng,
        deliveryRadiusKm: v.deliveryRadiusKm,
        acceptsCod: v.acceptsCod,
        accepting: v.accepting,
        logoKey: foodPhotos[SEED_VENDORS.indexOf(v) % foodPhotos.length],
        bannerKey: foodPhotos[(SEED_VENDORS.indexOf(v) + 1) % foodPhotos.length],
        maxConcurrentOrders: v.maxConcurrentOrders,
        // A seeded vendor with no payout account is deliverable but unpayable: vendor settlement
        // refuses with "Vendor payout account must be verified before withdrawal", so the whole
        // money-out half of the product cannot be exercised against seeded data. In production
        // this is written by vendor onboarding from the application's payoutInfo.
        payoutAccountJson: {
          type: 'MOMO',
          provider: 'MTN',
          accountNumber: `0${String(240000000 + SEED_VENDORS.indexOf(v) + 1)}`,
          accountName: v.name,
        },
        defaultPrepTimeMin: 25,
        hoursJson: {
          mon: [{ open: '08:00', close: '22:00' }],
          tue: [{ open: '08:00', close: '22:00' }],
          wed: [{ open: '08:00', close: '22:00' }],
          thu: [{ open: '08:00', close: '22:00' }],
          fri: [{ open: '08:00', close: '23:00' }],
          sat: [{ open: '08:00', close: '23:00' }],
          sun: [{ open: '10:00', close: '20:00' }]
        },
      }));
    }

    const ownerId = vendorOwnerMap.get(v.name)!;
    const staffCount = await vendorStaff.count({ where: { vendorId: vendor.id, userId: ownerId } });
    if (staffCount === 0) {
      await vendorStaff.save(vendorStaff.create({
        vendorId: vendor.id,
        userId: ownerId,
        displayName: `${v.name} Owner`,
        phone: `2335600000${String(SEED_VENDORS.indexOf(v) + 1).padStart(2, '0')}`,
        staffRole: 'MANAGER',
        active: true,
      }));
    }

    const itemsCount = await items.count({ where: { vendorId: vendor.id } });
    if (itemsCount === 0) {
      let idx = 0;
      for (const m of v.menu) {
        await items.save(items.create({
          vendorId: vendor.id,
          name: m.name,
          category: m.category,
          pricePesewas: m.pricePesewas,
          prepTimeMin: m.prepTimeMin,
          unit: m.unit || 'portion',
          stock: m.stock || null,
          prescriptionOnly: m.prescriptionOnly || false,
          available: true,
          imageKey: foodPhotos[idx % foodPhotos.length],
          description: `Freshly prepared local ${m.name} made with authentic Cape Coast ingredients.`,
          modifiers: [],
        }));
        idx += 1;
      }
    }
  }

  console.log('Seeding compliance onboarding timeline queues...');
  const appVettingData = [
    { name: 'Kofi Mensah', phone: '233201112222', kind: 'RIDER', status: ApplicationStatus.PENDING_REVIEW },
    { name: 'Sarah Mensah', phone: '233243334444', kind: 'VENDOR', status: ApplicationStatus.PENDING_REVIEW, business: ' Sarah Smoothies' },
    { name: 'John Boateng', phone: '233275556666', kind: 'RIDER', status: ApplicationStatus.REQUIRES_ACTION },
  ];

  for (const av of appVettingData) {
    let app: any = await applications.findOne({ where: { applicantPhone: av.phone } });
    if (!app) {
      app = await applications.save(applications.create({
        applicantUserId: userMap.get(SEED_CUSTOMERS[0].phone)!,
        applicantPhone: av.phone,
        applicantName: av.name,
        kind: av.kind as any,
        status: av.status,
        currentStage: av.status === ApplicationStatus.REQUIRES_ACTION ? 2 : 3,
        maxStages: av.kind === 'RIDER' ? 4 : 5,
        businessName: av.business || null,
        smileIdStatus: av.status === ApplicationStatus.PENDING_REVIEW ? SmileIdStatus.APPROVED : SmileIdStatus.PROCESSING,
        vehicle: av.kind === 'RIDER' ? 'MOTORBIKE' : null,
        vendorType: av.kind === 'VENDOR' ? 'FOOD' as any : null,
        requiresActionField: av.status === ApplicationStatus.REQUIRES_ACTION ? 'ghanaCardFrontKey' : null,
        reason: av.status === ApplicationStatus.REQUIRES_ACTION ? 'Selfie and Card names mismatch.' : null,
        stageData: {
          stage1: { firstName: av.name.split(' ')[0], lastName: av.name.split(' ')[1] },
          stage2: { idType: 'GHANA_CARD', idNumber: 'GHA-00928374-1', verified: true, jobId: 'smile-job-2291', pii: { first_name: av.name.split(' ')[0], surname: av.name.split(' ')[1], dob: '1996-05-18', gender: 'MALE' } }
        },
      } as any) as any);

      // Generate local mock Vector SVG document vetting credentials!
      const docFrontId = `doc-${app.id}-front`;
      const docLicenseId = `doc-${app.id}-license`;

      await documents.save(documents.create({
        applicationId: app.id,
        kind: 'national_id',
        fileName: 'ghana_card_front.svg',
        contentType: 'image/svg+xml',
        storageKey: `onboarding-documents/${app.id}/${docFrontId}`,
      }));
      saveMockSvg(app.id, docFrontId, 'national_id', av.name);

      if (app.kind === 'RIDER') {
        await documents.save(documents.create({
          applicationId: app.id,
          kind: 'drivers_license',
          fileName: 'license_front.svg',
          contentType: 'image/svg+xml',
          storageKey: `onboarding-documents/${app.id}/${docLicenseId}`,
        }));
        saveMockSvg(app.id, docLicenseId, 'drivers_license', av.name);
      }

      // Audit logs trail history
      await auditLogs.save(auditLogs.create({
        applicationId: app.id,
        reviewerId: userMap.get(SEED_RIDERS[0].phone)!,
        reviewerRole: 'compliance' as any,
        action: 'REQUIRES_ACTION',
        previousState: ApplicationStatus.IN_PROGRESS,
        newState: av.status,
        reason: av.status === ApplicationStatus.REQUIRES_ACTION ? 'Requested a clearer picture of Ghana Card' : 'Biometrics validated successfully',
      }));
    }
  }

  console.log('Seeding active order lifecycles...');
  const orderData = [
    { ref: 'OR-10293', status: OrderStatus.WAITING_FOR_RIDER, total: 3500 },
    { ref: 'OR-10294', status: OrderStatus.ACCEPTED, total: 4200 },
    { ref: 'OR-10295', status: OrderStatus.PREPARING, total: 6800 },
    { ref: 'OR-10296', status: OrderStatus.OUT_FOR_DELIVERY, total: 5400 },
    { ref: 'OR-10297', status: OrderStatus.DELIVERED, total: 8500 },
  ];

  const vendorList = await vendors.find();
  const riderList = await riders.find();

  for (const od of orderData) {
    let order: any = await orders.findOne({ where: { ref: od.ref } });
    if (!order) {
      order = await orders.save(orders.create({
        ref: od.ref,
        checkoutId: `checkout-${od.ref}`,
        customerId: userMap.get(SEED_CUSTOMERS[0].phone)!,
        vendorId: vendorList[SEED_VENDORS.indexOf(SEED_VENDORS[0]) % vendorList.length].id,
        vendorName: vendorList[0].name,
        riderId: od.status !== OrderStatus.WAITING_FOR_RIDER ? riderList[0].id : null,
        status: od.status,
        paymentMethod: PaymentMethod.PREPAID,
        totalPesewas: od.total,
        deliveryFeePesewas: 400,
        subtotalPesewas: od.total - 400,
        serviceFeePesewas: 100,
        platformFeePesewas: 100,
        vendorSharePesewas: od.total - 800,
        riderFeePesewas: 300,
        prepTimeMin: 25,
        addressJson: { label: 'UCC Campus Hall 3', lat: 5.105, lng: -1.247, source: 'GOOGLE_MAPS' },
        currency: 'GHS',
        lat: 5.105,
        lng: -1.247,
        address: 'UCC Campus Hall 3',
      } as any) as any);

      await orderItems.save(orderItems.create({
        orderId: order.id,
        itemId: 'mock-menu-item-uuid',
        name: 'Standard Jollof with Chicken',
        qty: 1,
        unitPricePesewas: od.total - 400,
        prepTimeMin: 25,
        unit: 'portion',
      } as any) as any);
    }
  }

  console.log('Seeding finance settlements and balances...');
  for (const v of vendorList) {
    let settlement = await vendorSettlements.findOne({ where: { vendorId: v.id } });
    if (!settlement) {
      await vendorSettlements.save(vendorSettlements.create({
        vendorId: v.id,
        cycleStart: new Date(Date.now() - 7 * 86400000),
        cycleEnd: new Date(),
        payoutPesewas: 125000,
        grossPesewas: 145000,
        status: VendorSettlementStatus.READY,
      } as any) as any);
    }
  }

  for (const r of riderList) {
    let withdrawal = await riderWithdrawals.findOne({ where: { riderId: r.id } });
    if (!withdrawal) {
      await riderWithdrawals.save(riderWithdrawals.create({
        riderId: r.id,
        amountPesewas: 7500,
        feePesewas: 200,
        destination: 'MTN Mobile Money Remit',
        status: WithdrawalStatus.REQUESTED,
      } as any));
    }
  }

  // Seed Customer credits
  const customerList = await users.find({ where: { role: Role.CUSTOMER } });
  for (const c of customerList) {
    let credit = await customerCredits.findOne({ where: { userId: c.id } });
    if (!credit) {
      await customerCredits.save(customerCredits.create({
        userId: c.id,
        balancePesewas: 5000, // GHS 50 pre-load credit
      } as any));
    }
  }

  // Seed Disputes
  const completedOrder = await orders.findOne({ where: { status: OrderStatus.DELIVERED } });
  if (completedOrder) {
    let dispute = await disputes.findOne({ where: { orderId: completedOrder.id } });
    if (!dispute) {
      await disputes.save(disputes.create({
        orderId: completedOrder.id,
        customerId: completedOrder.customerId,
        vendorId: completedOrder.vendorId,
        reason: DisputeReason.MISSING_ITEM,
        description: 'Customer claims chicken piece was missing.',
        status: 'OPEN',
      } as any) as any);
    }
  }

  // Align counters to prevent duplicate sequence conflicts.
  //
  // This was raw `INSERT OR REPLACE INTO id_counter ...` — sqlite-only syntax against an
  // unqualified table name, so on Postgres it aborted the run with a bare syntax error after
  // most of the data had already been written. `upsert` emits the right statement for either
  // dialect and resolves the entity's schema.
  const year = new Date().getFullYear();
  await authDs.getRepository(AuthIdCounter).upsert(
    { key: `ORC-${year}`, seq: SEED_CUSTOMERS.length + SEED_RIDERS.length },
    ['key'],
  );
  await onboardDs.getRepository(OnboardIdCounter).upsert(
    { key: `ORV-${year}`, seq: SEED_VENDORS.length },
    ['key'],
  );

  // Count what is actually in the database, not what the script intended to write. The summary
  // used to be a hardcoded string, so a seed that wrote nothing still reported five admins,
  // fifteen vendors and fifty orders.
  const summary = {
    users: await users.count(),
    vendors: await vendors.count(),
    menuItems: await items.count(),
    riders: await riders.count(),
    applications: await applications.count(),
    orders: await orders.count(),
  };

  await authDs.destroy();
  await catalogDs.destroy();
  await dispatchDs.destroy();
  await onboardDs.destroy();
  await orderDs.destroy();
  await ledgerDs.destroy();

  console.log(`\n✔ Seeding complete (${env.dbType}).`);
  console.log(
    `  ${summary.users} users · ${summary.vendors} vendors · ${summary.menuItems} menu items · ` +
      `${summary.riders} riders · ${summary.applications} onboarding applications · ${summary.orders} orders.`,
  );
  return summary;
}

/** Exported so a test can run the seeder in-process and assert what it actually wrote. */
export { main as runSeed };

// Only self-execute when invoked as a script, not when imported.
if (require.main === module) {
  main().catch((err) => {
    console.error('Seed run failed:', err);
    process.exit(1);
  });
}
