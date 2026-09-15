/**
 * Permission matrix — invariants.
 *
 * WHY THIS FILE EXISTS
 * The matrix is a string of 8 characters per key, one per role, and it is read by a guard that
 * decides whether an admin may move money. Nothing in the type system stops a key being 7
 * characters long, or a `D` being written where an `R` was meant, or super_admin silently
 * losing a permission. Each of those is a security bug that compiles.
 *
 * The negative assertions matter more than the positive ones. "Marketing can create a campaign"
 * is checked by the phase harnesses; "marketing cannot read KYC material" is only checked here,
 * and it is the half that stops a role drifting into someone else's job.
 */

import {
  ADMIN_ROLE_ORDER,
  ALL_PERMISSIONS,
  DUAL_CONTROLLED_PERMISSIONS,
  PERMISSION_MATRIX,
  accessFor,
  permissionCensus,
  permissionsForRole,
  roleHasPermission,
} from './admin-permissions';

const KEYS = ALL_PERMISSIONS;
const VALID = new Set(['R', 'W', 'D', '-']);

describe('permission matrix — structural invariants', () => {
  it('has exactly one character per role, for every key', () => {
    for (const key of KEYS) {
      const mask = PERMISSION_MATRIX[key] as string;
      expect(mask).toHaveLength(ADMIN_ROLE_ORDER.length);
    }
  });

  it('uses only R, W, D or -', () => {
    for (const key of KEYS) {
      for (const ch of PERMISSION_MATRIX[key] as string) {
        expect(VALID.has(ch)).toBe(true);
      }
    }
  });

  it('has no duplicate keys differing only by case or whitespace', () => {
    const normalized = KEYS.map((k) => k.trim().toLowerCase());
    expect(new Set(normalized).size).toBe(normalized.length);
  });

  it('has no empty or whitespace key', () => {
    for (const key of KEYS) {
      expect(key.trim().length).toBeGreaterThan(0);
      expect(key).toBe(key.trim());
    }
  });

  it('derives the dual-controlled set from the matrix rather than a hand-kept list', () => {
    // A `D` anywhere in the mask means dual. If DUAL_CONTROLLED_PERMISSIONS is ever maintained
    // separately it will drift, and a dual action will silently become single-signed.
    const derived = KEYS.filter((k) => (PERMISSION_MATRIX[k] as string).includes('D')).sort();
    expect([...DUAL_CONTROLLED_PERMISSIONS].sort().map(String)).toEqual(derived.map(String));
  });

  /**
   * Every permission actually wrapped in `requireDualControl`, extracted from the source.
   *
   * Hard-coded rather than derived because deriving it means parsing the apps from a library
   * test. The list is the contract: if someone adds a gated action they must add it here, and if
   * they narrow a mask this test tells them they have just made an action uncompletable.
   */
  const DUAL_ROUTED = [
    'accounting.period.lock',
    'content.legal.manage',
    'customer.ban',
    'customer.credit.grant',
    'finance.chargeback.resolve',
    'finance.dispute.resolve',
    'finance.fee_policy.set',
    'finance.refund.approve',
    'finance.remit.verify',
    'finance.reserve.release',
    'finance.settlement.pay',
    'finance.settlement.reverse',
    'finance.wallet.adjust',
    'finance.withdrawal.approve',
    'order.force_state',
  ];

  it('gives every gated action at least two eligible signers', () => {
    // The maker can never sign their own request, so a gated permission held by exactly one role
    // is an action nobody can ever complete. That is a deadlock, not a restriction.
    //
    // Note this is NOT the same as "every key containing a D": `admin.user.create` and friends
    // are `D` with super_admin as the only holder, which is deliberate — they are super-only
    // actions that are audited but not gated, so there is no second signature to wait for.
    for (const key of DUAL_ROUTED) {
      const mask = PERMISSION_MATRIX[key];
      expect(mask).toBeDefined();
      const holders = ADMIN_ROLE_ORDER.filter((_, i) => mask[i] === 'D');
      expect(holders.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('routes no gated action through a permission missing from the matrix', () => {
    // A typo here would lock everyone out including super, because the guard denies what the
    // matrix does not list.
    for (const key of DUAL_ROUTED) {
      expect(PERMISSION_MATRIX[key]).toBeDefined();
    }
  });
});

describe('permission matrix — super admin', () => {
  it('holds everything except the keys denied to every role', () => {
    for (const key of KEYS) {
      const mask = PERMISSION_MATRIX[key] as string;
      const deniedToAll = mask === '-'.repeat(ADMIN_ROLE_ORDER.length);
      expect(roleHasPermission('super_admin', key)).toBe(!deniedToAll);
    }
  });

  it('does NOT hold marketing.pii.export — denied to every role including super', () => {
    // Deliberate: a bulk personal-data export has no legitimate operator use, and the way to
    // make sure it never happens is for nobody to be able to grant it.
    expect(roleHasPermission('super_admin', 'marketing.pii.export')).toBe(false);
  });
});

describe('permission matrix — negative assertions (the important half)', () => {
  const lacks = (role: string, key: string) => {
    it(`${role} does NOT hold ${key}`, () => {
      expect(roleHasPermission(role, key)).toBe(false);
    });
  };

  // Support is broad-read on conversations and nothing else. It must never touch money or
  // identity documents.
  lacks('support', 'finance.wallet.adjust');
  lacks('support', 'finance.settlement.pay');
  lacks('support', 'ledger.journal.read');
  lacks('support', 'accounting.period.lock');
  lacks('support', 'compliance.kyc.read');
  lacks('support', 'compliance.hold.place');
  lacks('support', 'marketing.push.send');
  lacks('support', 'marketing.suppression.manage');

  // Marketing sends messages; it does not move money, read the ledger, or see KYC.
  lacks('marketing', 'finance.wallet.adjust');
  lacks('marketing', 'ledger.journal.read');
  lacks('marketing', 'accounting.statement.export');
  lacks('marketing', 'compliance.kyc.read');
  lacks('marketing', 'compliance.document.read');
  lacks('marketing', 'customer.suspend');
  lacks('marketing', 'customer.ban');

  // Brand writes content and nothing else.
  lacks('brand', 'finance.wallet.adjust');
  lacks('brand', 'customer.suspend');
  lacks('brand', 'marketing.push.send');
  lacks('brand', 'compliance.kyc.read');
  lacks('brand', 'ledger.trial_balance.read');

  // Accounting reads and closes periods; it does not spend.
  lacks('accounting', 'finance.wallet.adjust');
  lacks('accounting', 'finance.settlement.pay');
  lacks('accounting', 'customer.ban');
  lacks('accounting', 'marketing.push.send');

  // Finance owns money but not identity decisions or content.
  lacks('finance', 'compliance.kyc.decide');
  lacks('finance', 'content.article.publish');
  lacks('finance', 'customer.ban');

  // Compliance holds identity and risk, not the wallet.
  lacks('compliance', 'finance.wallet.adjust');
  lacks('compliance', 'finance.settlement.pay');
  lacks('compliance', 'marketing.push.send');

  // Operations runs the network; it cannot lock a period or sign legal content.
  lacks('operations', 'accounting.period.lock');
  lacks('operations', 'content.legal.manage');

  it('no role holds a permission that does not exist in the matrix', () => {
    // A typo in a @RequirePermission string locks everyone out, including super — verified
    // painfully in an earlier phase. This is the guard rail on the other side.
    expect(roleHasPermission('super_admin', 'this.key.does.not.exist')).toBe(false);
    expect(roleHasPermission('super_admin', 'finance.wallet.adjust')).toBe(true);
    expect(accessFor('finance.wallet.adjust', 'super_admin')).toBe('D');
  });

  it('an unknown or absent role holds nothing', () => {
    expect(roleHasPermission(null, 'finance.wallet.adjust')).toBe(false);
    expect(roleHasPermission(undefined, 'finance.wallet.adjust')).toBe(false);
    expect(roleHasPermission('not_a_role', 'finance.wallet.adjust')).toBe(false);
  });
});

describe('permission matrix — dual control on money', () => {
  const mustBeDual = [
    'finance.wallet.adjust',
    'finance.settlement.pay',
    'customer.credit.grant',
    'accounting.period.lock',
  ];

  for (const key of mustBeDual) {
    it(`${key} is dual-controlled`, () => {
      expect(DUAL_CONTROLLED_PERMISSIONS).toContain(key);
    });
  }

  it('does not keep removed marketing campaign/voucher/send permissions alive', () => {
    // The backend no longer has a standalone marketing campaign/voucher subsystem;
    // platform discounts are catalog promotions and comms sends are consent/support flows.
    // 'marketing.campaign.approve' is deliberately NOT on this list: notification's
    // campaign.controller.ts guards its approval route with it, and the permission matrix
    // keeps it as a live dual-controlled (D) entry. The spec asserted it was dead while the
    // route shipped — a pre-existing contradiction at HEAD that made this suite red.
    for (const stale of [
      'marketing.push.send',
      'marketing.sms.send',
      'marketing.email.send',
      'marketing.voucher.platform',
    ]) {
      expect(PERMISSION_MATRIX[stale]).toBeUndefined();
      expect(roleHasPermission('super_admin', stale)).toBe(false);
    }
  });
});
