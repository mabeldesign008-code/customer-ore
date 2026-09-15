'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card, ErrorBanner, Field, PageHeader, Pill, Table, inputClass, fmtWhen } from '@/components/ui';
import { gw } from '@/lib/api';

type Action = {
  id: string;
  actorUserId: string | null;
  actorAdminRole: string | null;
  permission: string | null;
  decision: string;
  reason: string | null;
  service: string | null;
  method: string | null;
  path: string | null;
  resourceType: string | null;
  resourceId: string | null;
  amountPesewas: number | null;
  degraded: boolean;
  ip: string | null;
  traceId: string | null;
  createdAt: string;
};

export default function AuditPage() {
  const [rows, setRows] = useState<Action[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [decision, setDecision] = useState('');
  const [permission, setPermission] = useState('');
  const [actor, setActor] = useState('');
  const [limit, setLimit] = useState('100');

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const q = new URLSearchParams({ limit: limit || '100' });
      if (decision) q.set('decision', decision);
      if (permission) q.set('permission', permission);
      if (actor) q.set('actorUserId', actor);
      // The endpoint returns a bare array.
      const res = await gw<Action[] | { actions: Action[] }>(`auth/admin/actions?${q.toString()}`);
      setRows(Array.isArray(res) ? res : res.actions || []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [decision, permission, actor, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const denials = rows.filter((r) => r.decision === 'deny').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        subtitle="Every permission decision the guard made, allowed or refused. Append-only — nothing here can be edited or deleted."
      />

      <ErrorBanner error={error} />

      <Card>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Decision">
            <select className={inputClass} value={decision} onChange={(e) => setDecision(e.target.value)}>
              <option value="">All</option>
              <option value="allow">Allowed</option>
              <option value="deny">Denied</option>
            </select>
          </Field>
          <Field label="Permission">
            <input
              className={inputClass}
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              placeholder="finance.withdrawal.approve"
            />
          </Field>
          <Field label="Actor user id">
            <input className={inputClass} value={actor} onChange={(e) => setActor(e.target.value)} placeholder="uuid" />
          </Field>
          <Field label="Rows">
            <input className={inputClass} value={limit} onChange={(e) => setLimit(e.target.value)} type="number" min="1" max="500" />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Apply filters'}
          </Button>
          <span className="text-xs text-slate-500">
            {rows.length} rows · <strong className="text-red-600">{denials} denied</strong>
          </span>
        </div>
      </Card>

      <Card>
        <Table
          columns={['When', 'Actor', 'Permission', 'Decision', 'Route', 'Reason']}
          rows={rows.map((r) => [
            <span key="w" className="whitespace-nowrap text-xs text-slate-500">
              {fmtWhen(r.createdAt)}
            </span>,
            <div key="a">
              <div className="text-xs font-semibold text-slate-700">{r.actorAdminRole || '—'}</div>
              <div className="font-mono text-[10px] text-slate-400">{(r.actorUserId || '').slice(0, 8)}</div>
            </div>,
            <code key="p" className="text-xs text-slate-700">
              {r.permission || '—'}
            </code>,
            <Pill key="d" tone={r.decision === 'deny' ? 'red' : 'green'}>
              {r.decision}
            </Pill>,
            <div key="r">
              <div className="text-xs text-slate-600">
                {r.method} {r.path}
              </div>
              {r.resourceId && <div className="font-mono text-[10px] text-slate-400">{r.resourceType}:{r.resourceId.slice(0, 8)}</div>}
            </div>,
            <div key="y">
              <div className="text-xs text-slate-600">{r.reason || '—'}</div>
              {r.degraded && (
                <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
                  degraded — decided from the token, auth was unreachable
                </div>
              )}
            </div>,
          ])}
        />
        {rows.length === 0 && !loading && (
          <p className="px-4 py-6 text-sm text-slate-500">Nothing recorded for these filters.</p>
        )}
      </Card>

      <p className="text-xs text-slate-500">
        A <strong>degraded</strong> row means the guard could not reach the auth service and fell back to the role in the
        JWT. Those rows are worth investigating: they are the ones where a suspension may not have been seen.
      </p>
    </div>
  );
}
