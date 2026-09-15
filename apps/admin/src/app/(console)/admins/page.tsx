'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, ErrorBanner, Field, PageHeader, Pill, Table, inputClass, fmtWhen, statusTone } from '@/components/ui';
import { gw, post } from '@/lib/api';
import { useAdmin } from '@/lib/context';

type AdminRow = {
  id: string;
  userId: string;
  adminRole: string;
  displayName: string | null;
  jobTitle: string | null;
  status: string;
  totpEnrolled: boolean;
  telegramLinked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  permissionCount: number;
};

type Matrix = {
  roles: string[];
  permissions: Record<string, string>;
  census: Record<string, { read: number; write: number; dual: number; total: number }>;
};

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

const NEW_PASSWORD_MIN = 10;

export default function AdminsPage() {
  const { user, refreshUser } = useAdmin();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // create form
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('support');
  const [displayName, setDisplayName] = useState('');

  // one-time enrolment payload — shown once, never stored
  const [enrolment, setEnrolment] = useState<{ email: string; secret: string; otpauthUrl: string; enrolToken: string } | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, mat] = await Promise.all([
        gw<{ admins: AdminRow[] }>('auth/admin/admins'),
        gw<Matrix>('auth/admin/matrix'),
      ]);
      setAdmins(list.admins || []);
      setMatrix(mat);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setError(null);
    setNotice(null);
    if (password.length < NEW_PASSWORD_MIN) {
      setError(`Password must be at least ${NEW_PASSWORD_MIN} characters.`);
      return;
    }
    setBusy('create');
    try {
      const res = await post<{
        admin: AdminRow;
        enrolment: { secret: string; otpauthUrl: string; enrolToken: string };
      }>('auth/admin/admins', { email, password, adminRole: role, displayName: displayName || undefined });
      setEnrolment({ email, ...res.enrolment });
      setShowCreate(false);
      setEmail('');
      setPassword('');
      setDisplayName('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function act(id: string, what: string, fn: () => Promise<unknown>, okMsg: string) {
    setError(null);
    setNotice(null);
    setBusy(`${id}:${what}`);
    try {
      await fn();
      setNotice(okMsg);
      await load();
      // If we changed our own account, the nav has to reflect it immediately.
      if (id === admins.find((a) => a.userId === user?.sub)?.id) await refreshUser();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function resetTotp(a: AdminRow) {
    setError(null);
    setBusy(`${a.id}:totp`);
    try {
      const res = await post<{ otpauthUrl: string }>(`auth/admin/admins/${a.id}/totp-reset`);
      setEnrolment({
        email: a.displayName || a.userId,
        secret: /secret=([A-Z2-7]+)/.exec(res.otpauthUrl)?.[1] || '',
        otpauthUrl: res.otpauthUrl,
        enrolToken: '',
      });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const roles = matrix?.roles ?? Object.keys(ROLE_LABELS);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admins & roles"
        subtitle="Every console account, what it may do, and whether it is currently allowed in."
        actions={
          <Button onClick={() => setShowCreate((v) => !v)}>{showCreate ? 'Cancel' : 'New admin'}</Button>
        }
      />

      <ErrorBanner error={error} />
      {notice && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</div>
      )}

      {enrolment && (
        <Card className="border-amber-300 bg-amber-50">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-amber-900">Hand this to {enrolment.email} — shown once</h3>
              <p className="mt-1 text-xs text-amber-800">
                They scan the QR (or type the secret) in an authenticator app, then post the enrolment token to
                <code className="mx-1 rounded bg-amber-100 px-1">POST /auth/admin/enrol</code>
                with their 6-digit code. Until then they cannot sign in, and this page will not show it again.
              </p>
              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="font-bold uppercase tracking-wide text-amber-700">TOTP secret</dt>
                  <dd className="font-mono break-all text-amber-950">{enrolment.secret}</dd>
                </div>
                {enrolment.enrolToken && (
                  <div>
                    <dt className="font-bold uppercase tracking-wide text-amber-700">Enrolment token</dt>
                    <dd className="font-mono break-all text-amber-950">{enrolment.enrolToken}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-bold uppercase tracking-wide text-amber-700">otpauth URL</dt>
                  <dd className="font-mono break-all text-amber-950">{enrolment.otpauthUrl}</dd>
                </div>
              </dl>
            </div>
            <Button onClick={() => setEnrolment(null)}>Done</Button>
          </div>
        </Card>
      )}

      {showCreate && (
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email (must already be a registered user)">
              <input className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </Field>
            <Field label="Display name">
              <input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </Field>
            <Field label={`Initial password (min ${NEW_PASSWORD_MIN} chars)`}>
              <input className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} type="text" />
            </Field>
            <Field label="Role">
              <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r] || r}
                    {matrix?.census?.[r] ? ` — ${matrix.census[r].total} permissions` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Provisioning promotes that user to <code>role=admin</code> and sets their console password. They stay in
            <strong> PENDING_ENROLMENT</strong> — held out of every route — until they finish TOTP enrolment.
          </p>
          <div className="mt-4">
            <Button onClick={create} disabled={busy === 'create'}>
              {busy === 'create' ? 'Creating…' : 'Create admin'}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <Table
          columns={['Admin', 'Role', 'Status', 'TOTP', 'Permissions', 'Last login', '']}
          rows={admins.map((a) => {
            const mine = a.userId === user?.sub;
            return [
              <div key="n">
                <div className="font-semibold text-slate-800">{a.displayName || '—'}</div>
                <div className="font-mono text-[10px] text-slate-400">{a.userId}</div>
              </div>,
              <Pill key="r" tone={a.adminRole === 'super_admin' ? 'red' : 'blue'}>
                {ROLE_LABELS[a.adminRole] || a.adminRole}
              </Pill>,
              <Pill key="s" tone={statusTone(a.status)}>
                {a.status.replace('_', ' ')}
              </Pill>,
              <span key="t" className="text-xs text-slate-500">
                {a.totpEnrolled ? 'enrolled' : 'pending'}
              </span>,
              <span key="p" className="text-sm font-semibold text-slate-700">
                {a.status === 'ACTIVE' ? a.permissionCount : 0}
              </span>,
              <span key="l" className="text-xs text-slate-500">
                {fmtWhen(a.lastLoginAt)}
              </span>,
              <div key="a" className="flex flex-wrap gap-1.5">
                {a.status === 'ACTIVE' ? (
                  <Button
                    small
                    tone="danger"
                    disabled={mine || busy === `${a.id}:suspend`}
                    onClick={() =>
                      act(a.id, 'suspend', () => post(`auth/admin/admins/${a.id}/status`, { status: 'SUSPENDED' }), 'Admin suspended — their next request is refused.')
                    }
                  >
                    Suspend
                  </Button>
                ) : (
                  <Button
                    small
                    disabled={busy === `${a.id}:activate`}
                    onClick={() =>
                      act(a.id, 'activate', () => post(`auth/admin/admins/${a.id}/status`, { status: 'ACTIVE' }), 'Admin reactivated.')
                    }
                  >
                    Reactivate
                  </Button>
                )}
                <select
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 disabled:opacity-50"
                  value={a.adminRole}
                  disabled={mine}
                  onChange={(e) =>
                    act(a.id, 'role', () => post(`auth/admin/admins/${a.id}/role`, { adminRole: e.target.value }), `Role changed to ${ROLE_LABELS[e.target.value] || e.target.value}.`)
                  }
                >
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r] || r}
                    </option>
                  ))}
                </select>
                <Button small disabled={mine || busy === `${a.id}:totp`} onClick={() => resetTotp(a)}>
                  Reset TOTP
                </Button>
              </div>,
            ];
          })}
        />
        {admins.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No admin accounts yet.</p>}
      </Card>

      <p className="text-xs text-slate-500">
        Suspension takes effect on the admin&apos;s <strong>next</strong> request — the permission guard reads the account
        status live, with no cache. You cannot suspend, re-role or reset the authenticator of your own account.
      </p>
    </div>
  );
}
