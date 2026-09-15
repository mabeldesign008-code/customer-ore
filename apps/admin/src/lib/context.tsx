'use client';

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { gw } from './api';

export type UserDetails = {
  sub: string;
  role: string;
  roles?: string[];
  /** Which kind of admin this is (AdminRole). Present on the JWT for role='admin'. */
  adminRole?: string | null;
  phone: string;
  name?: string | null;
};

/**
 * `GET /auth/admin/me` — the signed-in admin's own record and effective permissions.
 *
 * This is the single source of truth for what the console shows. The backend already
 * computed it with the same denials-beat-grants ordering that `PermissionGuard` uses,
 * and it returns an empty list for any non-ACTIVE admin, so a suspended admin's console
 * empties out at the same moment their API calls start returning 403.
 */
export type AdminSelf = {
  admin: {
    id: string;
    userId: string;
    adminRole: string;
    displayName: string | null;
    jobTitle: string | null;
    status: string;
    totpEnrolled: boolean;
    telegramLinked: boolean;
    lastLoginAt: string | null;
    permissionCount: number;
  } | null;
  adminRole: string | null;
  permissions: string[];
  status: string;
  mustEnrol: boolean;
};

type AdminContextType = {
  user: UserDetails | null;
  self: AdminSelf | null;
  adminRole: string | null;
  permissions: Set<string>;
  can: (permission: string) => boolean;
  loading: boolean;
  /** Set once the session is known to be missing or rejected. */
  signedOut: boolean;
  refreshUser: () => Promise<void>;
  signOut: () => void;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

/**
 * Route → the permission required to see it.
 *
 * Replaces the old `ROUTE_ROLES` table, which listed *role names* per route and was
 * checked against a role the user picked from a dropdown. That made the console's idea
 * of access unrelated to the backend's. Every value here is a real key in
 * `PERMISSION_MATRIX`; a route with no entry is visible to any signed-in admin.
 */
export const ROUTE_PERMISSIONS: Record<string, string> = {
  '/onboarding': 'onboarding.application.read',
  '/orders': 'order.list',
  '/riders': 'rider.list',
  '/vendors': 'vendor.list',
  '/ledger/wallets': 'finance.wallet.read',
  '/ledger/withdrawals': 'finance.withdrawal.read',
  '/ledger/settlements': 'finance.settlement.read',
  '/ledger/disputes': 'finance.dispute.read',
  '/ledger/chargebacks': 'finance.chargeback.read',
  '/ledger/credit': 'customer.credit.grant',
  '/referrals': 'marketing.referral.manage',
  '/support': 'support.queue.read',
  '/support/voice': 'support.voice.answer',
  '/admins': 'admin.user.read',
  '/audit': 'admin.audit.read',
  '/matrix': 'admin.role.matrix.read',
  '/flags': 'platform.flag.read',
  '/approvals': 'admin.approval.queue.read',
};

/** Longest-prefix match, so `/ledger/settlements/abc` resolves to its own entry. */
export function permissionForRoute(path: string): string | null {
  const key = Object.keys(ROUTE_PERMISSIONS)
    .sort((a, b) => b.length - a.length)
    .find((k) => (k === '/' ? path === '/' : path === k || path.startsWith(`${k}/`)));
  return key ? ROUTE_PERMISSIONS[key] : null;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDetails | null>(null);
  const [self, setSelf] = useState<AdminSelf | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      // `GET /auth/me` returns the verified JWT payload — including `adminRole`,
      // which the login response body does not carry.
      const me = await gw<UserDetails>('auth/me');
      setUser(me);
      setSignedOut(false);
      if (me.role === 'admin') {
        const s = await gw<AdminSelf>('auth/admin/me');
        setSelf(s);
      } else {
        setSelf(null);
      }
    } catch {
      // No usable session. Do NOT invent one — an earlier version installed a
      // hardcoded mock super admin here, so the console looked signed in with no
      // credentials at all.
      setUser(null);
      setSelf(null);
      setSignedOut(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const permissions = new Set(self?.permissions ?? []);
  const can = useCallback((permission: string) => permissions.has(permission), [self?.permissions]);

  const signOut = useCallback(() => {
    setUser(null);
    setSelf(null);
    setSignedOut(true);
  }, []);

  return (
    <AdminContext.Provider
      value={{
        user,
        self,
        adminRole: self?.adminRole ?? user?.adminRole ?? null,
        permissions,
        can,
        loading,
        signedOut,
        refreshUser,
        signOut,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
