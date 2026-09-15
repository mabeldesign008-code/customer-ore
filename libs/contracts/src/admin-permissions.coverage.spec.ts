import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { ALL_PERMISSIONS } from './admin-permissions';

/**
 * Permissions declared in the matrix but not required by any route.
 *
 * These are not dead entries to be pruned. The matrix is policy, reviewed by people who are not
 * engineers, and deleting `compliance.dsar.handle` does not make data-subject access requests
 * stop mattering — it just removes the place where the answer to "who may handle one" is
 * written down. They are capabilities the platform has decided on and not yet built routes for.
 *
 * The problem was that nobody could tell those apart from the dangerous case: a route whose
 * `@RequirePermission` decorator is dropped in a refactor also lands in this list, silently, and
 * the endpoint becomes reachable by any authenticated admin. Both look like "declared but
 * unattached".
 *
 * Pinning the set fixes that. Losing a guard makes the list grow and fails this test by name;
 * building one of the planned features makes it shrink, and the fix is to delete a line here.
 */
const KNOWN_UNATTACHED = new Set<string>([
  'accounting.statement.export',
  'catalog.promotion.platform',
  'compliance.breach.notify',
  'compliance.breach.register',
  'compliance.complaint.manage',
  'compliance.document.read',
  'compliance.dsar.handle',
  'compliance.erasure.execute',
  'compliance.retention.configure',
  'content.article.propose',
  'content.help.manage',
  'content.seo.manage',
  'customer.ban',
  'customer.credit.freeze',
  'customer.marketing_consent.read',
  'customer.orders.read',
  'customer.pii.export',
  'customer.session.revoke',
  'finance.fee_policy.read',
  'finance.fee_policy.set',
  'finance.hold.lift',
  'finance.hold.place',
  'ledger.breakdown.read',
  'ops.anomaly.read',
  'ops.anomaly.resolve',
  'ops.incident.manage',
  'ops.map.live',
  'order.delivery_proof.read',
  'order.detail.read',
  'order.export',
  'order.issue.resolve',
  'order.otp.reveal',
  'platform.flag.read',
  'platform.health.read',
  'platform.webhook.read',
  'rider.block.impose',
  'rider.errand_tier.set',
  'rider.incident.manage',
  'rider.incident.read',
  'rider.profile.read',
  'rider.status.set',
  'rider.vehicle.edit',
  'rider.wallet.read',
  'support.broadcast_alert.send',
  'support.macro.manage',
  'support.reply.internal',
  'support.sla.configure',
  'support.telegram.link_self',
  'support.thread.read_ai_live',
  'support.thread.read_all',
  'support.tool_audit.read',
  'vendor.approval.set',
  'vendor.commission.override',
  'vendor.list',
  'vendor.payout_account.change',
  'vendor.payout_account.read',
  'vendor.profile.read',
  'vendor.suspend',
]);

/** Every `@RequirePermission('...')` string in the repository. */
function permissionsUsedByRoutes(): Set<string> {
  const root = findRepoRoot();
  const found = new Set<string>();

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.git' || entry === '.next') continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
        for (const line of readFileSync(full, 'utf8').split('\n')) {
          // Skip comments: `permission.guard.ts` documents the decorator with a
          // `@RequirePermission('x.y.z')` example, which is not a route and not in the matrix.
          if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
          for (const m of line.matchAll(/RequirePermission\(\s*'([^']+)'/g)) found.add(m[1]);
        }
      }
    }
  };

  for (const top of ['apps', 'libs']) walk(join(root, top));
  return found;
}

function findRepoRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    try {
      statSync(join(dir, 'apps'));
      return dir;
    } catch {
      dir = resolve(dir, '..');
    }
  }
  throw new Error('could not locate repository root');
}

describe('permission matrix coverage', () => {
  const declared: string[] = [...ALL_PERMISSIONS];
  const used = permissionsUsedByRoutes();

  it('finds the route decorators at all', () => {
    // If the scan silently matched nothing, every assertion below would pass vacuously.
    expect(used.size).toBeGreaterThan(100);
  });

  it('has no route requiring a permission that is not in the matrix', () => {
    // The guard fails closed on an unknown permission, so this would be a hard 403 in production.
    const orphans = [...used].filter((p) => !declared.includes(p));
    expect(orphans).toEqual([]);
  });

  it('has not lost a guard from any route', () => {
    const unattached = declared.filter((p) => !used.has(p)).sort();
    const unexpected = unattached.filter((p) => !KNOWN_UNATTACHED.has(p));

    // A permission that used to be attached and now is not means some endpoint lost its
    // `@RequirePermission` and is reachable by any authenticated admin.
    expect(unexpected).toEqual([]);
  });

  it('does not carry stale entries for features that have since been built', () => {
    const unattached = new Set(declared.filter((p) => !used.has(p)));
    const stale = [...KNOWN_UNATTACHED].filter((p) => !unattached.has(p)).sort();

    // Keeping a built feature on the planned list would hide the next lost guard on that same
    // permission, which is exactly what this file exists to catch.
    expect(stale).toEqual([]);
  });

  it('lists every planned permission against a real matrix entry', () => {
    const unknown = [...KNOWN_UNATTACHED].filter((p) => !declared.includes(p)).sort();
    expect(unknown).toEqual([]);
  });
});
