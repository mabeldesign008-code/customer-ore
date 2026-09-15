'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import { useAdmin, permissionForRoute } from '@/lib/context';

/**
 * Every entry carries the permission that reveals it. The list is filtered against the
 * signed-in admin's *effective* permissions from `GET /auth/admin/me` — the same set
 * `PermissionGuard` enforces — so the nav cannot offer a link the backend will 403.
 *
 * There used to be a "View As Role" dropdown here that let anyone preview any role's
 * console. It was removed: it simulated access rather than granting it, so it taught
 * people to distrust the 403s. To see another role's view, sign in as that role.
 */
/**
 * Pages that exist in this build. An entry is only offered if its page is here AND the
 * admin holds its permission — otherwise Finance would see "Approvals" and Operations
 * "Feature flags" and both would 404. Move a href into this set when its page lands.
 */
const BUILT_ROUTES = new Set([
  '/',
  '/onboarding',
  '/orders',
  '/riders',
  '/vendors',
  '/referrals',
  '/ledger/wallets',
  '/ledger/withdrawals',
  '/ledger/settlements',
  '/ledger/disputes',
  '/ledger/chargebacks',
  '/ledger/credit',
  '/support',
  '/support/voice',
  '/admins',
  '/audit',
  '/matrix',
  '/marketing/campaigns',

  // Declared in NAV but not built yet, so deliberately absent here:
  //   /support   — Phase 4 (support console + Telegram)
  //   /approvals — Phase 3 (maker-checker entity and service do not exist yet)
  //   /flags     — T2.5
]);

const NAV: { href: string; label: string; permission?: string; group: string }[] = [
  { href: '/', label: 'Overview', group: 'Operate' },
  { href: '/onboarding', label: 'Onboarding', permission: 'onboarding.application.read', group: 'Operate' },
  { href: '/orders', label: 'Orders', permission: 'order.list', group: 'Operate' },
  { href: '/riders', label: 'Riders', permission: 'rider.list', group: 'Operate' },
  { href: '/vendors', label: 'Vendors', permission: 'vendor.list', group: 'Operate' },
  { href: '/referrals', label: 'Referrals', permission: 'marketing.referral.manage', group: 'Operate' },
  { href: '/marketing/campaigns', label: 'Campaigns', permission: 'marketing.campaign.read', group: 'Operate' },

  { href: '/support', label: 'Support queue', permission: 'support.queue.read', group: 'Money' },
  { href: '/support/voice', label: 'Voice console', permission: 'support.voice.answer', group: 'Money' },
  { href: '/ledger/wallets', label: 'Rider wallets', permission: 'finance.wallet.read', group: 'Money' },
  { href: '/ledger/withdrawals', label: 'Withdrawals', permission: 'finance.withdrawal.read', group: 'Money' },
  { href: '/ledger/settlements', label: 'Settlements', permission: 'finance.settlement.read', group: 'Money' },
  { href: '/ledger/disputes', label: 'Disputes', permission: 'finance.dispute.read', group: 'Money' },
  { href: '/ledger/chargebacks', label: 'Chargebacks', permission: 'finance.chargeback.read', group: 'Money' },
  { href: '/ledger/credit', label: 'Customer credit', permission: 'customer.credit.grant', group: 'Money' },

  { href: '/approvals', label: 'Approvals', permission: 'admin.approval.queue.read', group: 'Govern' },
  { href: '/admins', label: 'Admins & roles', permission: 'admin.user.read', group: 'Govern' },
  { href: '/audit', label: 'Audit log', permission: 'admin.audit.read', group: 'Govern' },
  { href: '/matrix', label: 'Permission matrix', permission: 'admin.role.matrix.read', group: 'Govern' },
  { href: '/flags', label: 'Feature flags', permission: 'platform.flag.read', group: 'Govern' },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  operations: 'Operations',
  support: 'Support',
  finance: 'Finance',
  accounting: 'Accounting',
  marketing: 'Marketing',
  brand: 'Brand',
  compliance: 'Compliance',
};

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const path = pathname || '/';
  const router = useRouter();
  const { user, self, adminRole, can, signOut } = useAdmin();

  async function logout() {
    await fetch('/gw/session', { method: 'DELETE', credentials: 'include' });
    signOut();
    router.replace('/login');
  }

  const visible = NAV.filter((item) => BUILT_ROUTES.has(item.href) && (!item.permission || can(item.permission)));
  const groups = [...new Set(visible.map((v) => v.group))];
  const required = permissionForRoute(path);
  const allowed = !required || can(required);
  const status = self?.status ?? 'UNKNOWN';
  const notActive = status !== 'ACTIVE';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 shrink-0 flex-col bg-slate-900 text-white shadow-lg">
        <div className="px-5 py-6">
          <div className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-white">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-ore-500" />
            ore
          </div>
          <div className="mt-0.5 text-xs text-slate-400">Admin Management Console</div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-6">
          {groups.map((group) => (
            <div key={group}>
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{group}</div>
              <div className="space-y-1">
                {visible
                  .filter((item) => item.group === group)
                  .map((item) => {
                    const active = item.href === '/' ? path === '/' : path === item.href || path.startsWith(`${item.href}/`);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          active ? 'bg-ore-600 text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
          {visible.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-500">
              No permissions on this account. Ask a super admin to assign a role.
            </p>
          )}
        </nav>

        <div className="border-t border-slate-800 p-4">
          <div className="mb-3">
            <div className="text-xs text-slate-400">Signed in as</div>
            <div className="truncate text-sm font-semibold text-slate-200">
              {self?.admin?.displayName || user?.name || user?.phone || 'Admin'}
            </div>
            <div className="mt-0.5 truncate text-[10px] text-slate-400">
              {adminRole ? ROLE_LABELS[adminRole] || adminRole : 'no role assigned'} ·{' '}
              {self?.permissions.length ?? 0} permissions
            </div>
            {notActive && (
              <div className="mt-2 rounded-md border border-amber-700/40 bg-amber-950/30 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                {status.replace('_', ' ')}
              </div>
            )}
          </div>
          <button
            onClick={logout}
            className="w-full rounded-md border border-red-900/30 bg-red-950/20 px-2.5 py-1.5 text-left text-xs font-semibold text-red-400 transition-all hover:bg-red-900/30 hover:text-red-300"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8 shadow-sm">
          <div className="text-xs font-medium text-slate-500">
            Cape Coast · <span className="text-slate-700">pesewas are source of truth</span>
          </div>
          <span className="inline-flex rounded-full border border-ore-100 bg-ore-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-ore-700 shadow-sm">
            {adminRole ? ROLE_LABELS[adminRole] || adminRole : 'unassigned'}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-8">
          {notActive ? (
            <Denied
              title={`This account is ${status.toLowerCase()}`}
              body={
                status === 'PENDING_ENROLMENT'
                  ? 'Finish TOTP enrolment with the QR code a super admin gave you, then sign in again.'
                  : 'A super admin has suspended or revoked this account. Every API call will be refused until they restore it.'
              }
              onHome={() => router.push('/')}
            />
          ) : allowed ? (
            children
          ) : (
            <Denied
              title="Access denied"
              body={
                required
                  ? `This page needs the permission ${required}, which your role does not hold.`
                  : 'Your role cannot open this page.'
              }
              onHome={() => router.push('/')}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function Denied({ title, body, onHome }: { title: string; body: string; onHome: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
      </div>
      <h2 className="mb-2 text-xl font-bold tracking-tight text-slate-900">{title}</h2>
      <p className="mb-6 max-w-md text-sm text-slate-500">{body}</p>
      <button
        onClick={onHome}
        className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-slate-800"
      >
        Back to Overview
      </button>
    </div>
  );
}
