import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@ore/contracts';
import { PermissionGuard, PERMISSION_AUDIT_SINK } from './permission.guard';
import { IS_INTERNAL_KEY, IS_PUBLIC_KEY, ROLES_KEY } from './guards';
import { breakerFor } from './breaker';
import { serviceUrl } from './http';

/**
 * The decision table for admin authorisation.
 *
 * Every branch here is a reason someone is allowed or refused access to a privileged endpoint,
 * and the expensive failures are silent ones: a guard that quietly allows is indistinguishable
 * from a guard that works, until it matters.
 */
describe('PermissionGuard', () => {
  const PERMISSIONS_KEY = 'ore_permissions';

  let guard: PermissionGuard;
  let audit: { record: jest.Mock };
  let reflectorValues: Record<string, unknown>;
  let fetchMock: jest.Mock;

  const reflector = {
    getAllAndOverride: jest.fn((key: string) => reflectorValues[key]),
  } as unknown as Reflector;

  const ctx = (user?: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ user, method: 'POST', url: '/admin/thing', ip: '1.2.3.4' }) }),
      getHandler: () => function handler() { /* route */ },
      getClass: () => class ThingController {},
    }) as unknown as ExecutionContext;

  const admin = (over: Record<string, unknown> = {}) => ({
    sub: `user-${Math.random()}`,
    role: Role.ADMIN,
    adminRole: 'operations',
    phone: '233500000000',
    ...over,
  });

  /** What `auth/internal/admins/:id` replies. */
  const authReplies = (body: unknown, ok = true) => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(body), { status: ok ? 200 : 500, headers: { 'content-type': 'application/json' } }),
    );
  };

  beforeEach(() => {
    // Breakers are module-global and keyed by host, so the "auth unreachable" cases below trip
    // the breaker for the auth host and every later test degrades instead of calling auth.
    breakerFor(new URL(serviceUrl('auth')).host).reset();
    reflectorValues = {};
    audit = { record: jest.fn() };
    fetchMock = jest.fn();
    global.fetch = fetchMock as never;
    authReplies({ found: true, adminRole: 'operations', status: 'ACTIVE', grants: [], denials: [] });
    guard = new PermissionGuard(reflector, audit as never);
    jest.spyOn((guard as never as { logger: { warn: jest.Mock } }).logger, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('routes the guard does not police', () => {
    it('allows a public route', async () => {
      reflectorValues[IS_PUBLIC_KEY] = true;
      await expect(guard.canActivate(ctx())).resolves.toBe(true);
    });

    it('allows an internal route, which AuthGuard has already authenticated by MAC', async () => {
      reflectorValues[IS_INTERNAL_KEY] = true;
      await expect(guard.canActivate(ctx())).resolves.toBe(true);
    });

    it('allows a request with no user, because AuthGuard runs first and would have thrown', async () => {
      await expect(guard.canActivate(ctx(undefined))).resolves.toBe(true);
    });

    it('allows a route that declares neither a permission nor an admin-only role', async () => {
      await expect(guard.canActivate(ctx(admin()))).resolves.toBe(true);
    });

    it('allows a non-admin on a mixed-role route', async () => {
      // A vendor has no admin_user row, so running them through the matrix would 403 every
      // vendor the moment a mixed route declared a permission. Their scoping happens in the
      // service layer instead (audit F-SEC-4).
      reflectorValues[PERMISSIONS_KEY] = ['vendor.profile.read'];
      reflectorValues[ROLES_KEY] = [Role.VENDOR, Role.ADMIN];

      await expect(guard.canActivate(ctx({ sub: 'v1', role: Role.VENDOR, phone: '233' }))).resolves.toBe(true);
    });
  });

  describe('permission held or not', () => {
    beforeEach(() => {
      reflectorValues[PERMISSIONS_KEY] = ['ops.incident.manage'];
      reflectorValues[ROLES_KEY] = [Role.ADMIN];
    });

    it('allows an admin whose role grants the permission', async () => {
      await expect(guard.canActivate(ctx(admin({ adminRole: 'operations' })))).resolves.toBe(true);
    });

    it('refuses an admin whose role does not grant it', async () => {
      authReplies({ found: true, adminRole: 'marketing', status: 'ACTIVE', grants: [], denials: [] });
      await expect(guard.canActivate(ctx(admin({ adminRole: 'marketing' })))).rejects.toThrow(/Missing permission/);
    });

    it('allows when any one of several accepted permissions is held', async () => {
      reflectorValues[PERMISSIONS_KEY] = ['finance.hold.place', 'ops.incident.manage'];
      await expect(guard.canActivate(ctx(admin({ adminRole: 'operations' })))).resolves.toBe(true);
    });

    it('honours a per-admin grant on top of the role', async () => {
      authReplies({ found: true, adminRole: 'marketing', status: 'ACTIVE', grants: ['ops.incident.manage'], denials: [] });
      await expect(guard.canActivate(ctx(admin({ adminRole: 'marketing' })))).resolves.toBe(true);
    });

    it('lets an explicit denial beat both the grant and the role', async () => {
      // A denial is how an admin under investigation is narrowed without demoting them. If a
      // role grant could override it, the control would be unusable.
      authReplies({
        found: true,
        adminRole: 'operations',
        status: 'ACTIVE',
        grants: ['ops.incident.manage'],
        denials: ['ops.incident.manage'],
      });
      await expect(guard.canActivate(ctx(admin()))).rejects.toThrow(/Missing permission/);
    });
  });

  describe('super_admin', () => {
    beforeEach(() => {
      reflectorValues[ROLES_KEY] = [Role.ADMIN];
      authReplies({ found: true, adminRole: 'super_admin', status: 'ACTIVE', grants: [], denials: [] });
    });

    it('holds what the matrix grants super_admin', async () => {
      reflectorValues[PERMISSIONS_KEY] = ['ops.incident.manage'];
      await expect(guard.canActivate(ctx(admin({ adminRole: 'super_admin' })))).resolves.toBe(true);
    });

    it('does not hold a permission the matrix denies to every role', async () => {
      // `marketing.pii.export` is '-' for all eight roles including super. A super_admin who
      // could bypass the matrix would make the matrix advisory.
      reflectorValues[PERMISSIONS_KEY] = ['marketing.pii.export'];
      await expect(guard.canActivate(ctx(admin({ adminRole: 'super_admin' })))).rejects.toThrow(/Missing permission/);
    });
  });

  describe('account status', () => {
    beforeEach(() => {
      reflectorValues[PERMISSIONS_KEY] = ['ops.incident.manage'];
      reflectorValues[ROLES_KEY] = [Role.ADMIN];
    });

    for (const status of ['SUSPENDED', 'REVOKED', 'PENDING_ENROLMENT', 'NOT_PROVISIONED']) {
      it(`refuses a ${status} admin regardless of their role`, async () => {
        authReplies({ found: true, adminRole: 'super_admin', status, grants: ['ops.incident.manage'], denials: [] });
        await expect(guard.canActivate(ctx(admin()))).rejects.toThrow(new RegExp(status.toLowerCase().replace('_', '_')));
      });
    }

    it('refuses a role=ADMIN token with no admin_user row', async () => {
      // A token can outlive the account it describes. Trusting the JWT's own claim would let a
      // deleted admin keep working until it expired.
      authReplies({ found: false });
      await expect(guard.canActivate(ctx(admin()))).rejects.toThrow(/not_provisioned/);
    });

    it('still lets a suspended admin read their own access record', async () => {
      // It is the only way the console can discover it is suspended in order to say so, and
      // `AdminService.self()` already returns an empty permission list for a non-ACTIVE account.
      reflectorValues[PERMISSIONS_KEY] = ['admin.audit.read_own'];
      authReplies({ found: true, adminRole: 'operations', status: 'SUSPENDED', grants: [], denials: [] });

      await expect(guard.canActivate(ctx(admin()))).resolves.toBe(true);
    });

    it('does not let self-inspection smuggle a second permission through', async () => {
      reflectorValues[PERMISSIONS_KEY] = ['admin.audit.read_own', 'finance.hold.place'];
      authReplies({ found: true, adminRole: 'operations', status: 'SUSPENDED', grants: [], denials: [] });

      await expect(guard.canActivate(ctx(admin()))).rejects.toThrow(/suspended/);
    });
  });

  describe('fail closed', () => {
    it('refuses an admin-only route that declares no permission', async () => {
      // The dangerous default: a new admin endpoint someone forgot to tag would otherwise be
      // reachable by every admin in the company.
      reflectorValues[ROLES_KEY] = [Role.ADMIN];

      await expect(guard.canActivate(ctx(admin()))).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(ctx(admin()))).rejects.toThrow(/no permission declared/);
    });

    it('logs the untagged route so it can be found and fixed', async () => {
      reflectorValues[ROLES_KEY] = [Role.ADMIN];
      const warn = jest.spyOn((guard as never as { logger: { warn: jest.Mock } }).logger, 'warn');

      await guard.canActivate(ctx(admin())).catch(() => undefined);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('/admin/thing'));
    });
  });

  describe('when auth is unreachable', () => {
    beforeEach(() => {
      reflectorValues[PERMISSIONS_KEY] = ['ops.incident.manage'];
      reflectorValues[ROLES_KEY] = [Role.ADMIN];
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    });

    it('degrades to the role in the JWT rather than locking every admin out', async () => {
      // An auth blip must not stop operations responding to an incident.
      await expect(guard.canActivate(ctx(admin({ adminRole: 'operations' })))).resolves.toBe(true);
    });

    it('still refuses a role the JWT does not claim', async () => {
      await expect(guard.canActivate(ctx(admin({ adminRole: 'marketing' })))).rejects.toThrow(/Missing permission/);
    });

    it('marks the decision degraded in the audit trail', async () => {
      await guard.canActivate(ctx(admin()));
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ degraded: true }));
    });
  });

  describe('audit trail', () => {
    beforeEach(() => {
      reflectorValues[PERMISSIONS_KEY] = ['ops.incident.manage'];
      reflectorValues[ROLES_KEY] = [Role.ADMIN];
    });

    it('records an allow with the permission that carried it', async () => {
      await guard.canActivate(ctx(admin()));
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ decision: 'allow', permission: 'ops.incident.manage' }),
      );
    });

    it('records a deny with the reason', async () => {
      authReplies({ found: true, adminRole: 'marketing', status: 'ACTIVE', grants: [], denials: [] });
      await guard.canActivate(ctx(admin({ adminRole: 'marketing' }))).catch(() => undefined);

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ decision: 'deny', reason: 'permission not held' }),
      );
    });

    it('records the route, so a decision can be traced to an endpoint', async () => {
      await guard.canActivate(ctx(admin()));
      expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', path: '/admin/thing' }));
    });

    it('enforces even when there is no audit sink to record the decision', async () => {
      // Every service gets a sink now, but the guard must not become permissive if one is
      // missing — enforcement and recording are separate concerns.
      const unaudited = new PermissionGuard(reflector, undefined as never);
      authReplies({ found: true, adminRole: 'marketing', status: 'ACTIVE', grants: [], denials: [] });

      await expect(unaudited.canActivate(ctx(admin({ adminRole: 'marketing' })))).rejects.toThrow(/Missing permission/);
    });
  });

  describe('no stale-grant window', () => {
    beforeEach(() => {
      reflectorValues[PERMISSIONS_KEY] = ['ops.incident.manage'];
      reflectorValues[ROLES_KEY] = [Role.ADMIN];
    });

    it('re-reads the admin record on every request', async () => {
      // The TTL is deliberately zero. A cached grant is a window in which a suspended or revoked
      // admin still gets through — on every service, with no way for auth to invalidate it. For
      // a system that pays money out, that window is the risk that matters most, and admin
      // traffic is low enough that a lookup per request is cheap.
      const user = admin();
      await guard.canActivate(ctx(user));
      await guard.canActivate(ctx(user));

      expect(fetchMock.mock.calls.filter((c) => String(c[0]).includes('/admins/'))).toHaveLength(2);
    });

    it('applies a suspension to the very next request', async () => {
      const user = admin();
      await expect(guard.canActivate(ctx(user))).resolves.toBe(true);

      authReplies({ found: true, adminRole: 'operations', status: 'SUSPENDED', grants: [], denials: [] });
      await expect(guard.canActivate(ctx(user))).rejects.toThrow(/suspended/);
    });

    it('applies a revoked permission to the very next request', async () => {
      const user = admin();
      await expect(guard.canActivate(ctx(user))).resolves.toBe(true);

      authReplies({ found: true, adminRole: 'operations', status: 'ACTIVE', grants: [], denials: ['ops.incident.manage'] });
      await expect(guard.canActivate(ctx(user))).rejects.toThrow(/Missing permission/);
    });

    it('exposes invalidate for a future push-based scheme', async () => {
      // The seam exists so the TTL can be raised once auth can invalidate, and not before.
      const user = admin();
      await guard.canActivate(ctx(user));
      expect(() => guard.invalidate(user.sub)).not.toThrow();
    });

    it('evicts incrementally rather than dropping every admin at once', async () => {
      // A wholesale clear() means the instant the cache fills, every admin is evicted together
      // and the next request from each of them hits auth: a stampede triggered by being busy,
      // at the moment of being busy.
      for (let i = 0; i < 1200; i++) {
        await guard.canActivate(ctx(admin({ sub: `bulk-${i}` })));
      }
      const cache = (guard as never as { cache: Map<string, unknown> }).cache;
      expect(cache.size).toBeGreaterThan(100);
    });
  });
});
