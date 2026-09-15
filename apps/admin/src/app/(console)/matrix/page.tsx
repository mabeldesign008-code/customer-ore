'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { Card, ErrorBanner, PageHeader, Table, inputClass } from '@/components/ui';
import { gw } from '@/lib/api';
import { useAdmin } from '@/lib/context';

type Matrix = {
  roles: string[];
  permissions: Record<string, string>;
  census: Record<string, { read: number; write: number; dual: number; total: number }>;
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super',
  operations: 'Ops',
  support: 'Support',
  finance: 'Finance',
  accounting: 'Acct',
  marketing: 'Mktg',
  brand: 'Brand',
  compliance: 'Compl',
};

const CELL: Record<string, { label: string; cls: string; title: string }> = {
  R: { label: 'R', cls: 'bg-blue-50 text-blue-700', title: 'Read' },
  W: { label: 'W', cls: 'bg-amber-50 text-amber-800', title: 'Write' },
  D: { label: '⚖', cls: 'bg-red-50 text-red-700', title: 'Dual-controlled — needs a second approver' },
  '-': { label: '·', cls: 'text-slate-300', title: 'No access' },
};

export default function MatrixPage() {
  const { permissions } = useAdmin();
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);

  useEffect(() => {
    gw<Matrix>('auth/admin/matrix')
      .then(setMatrix)
      .catch((err: Error) => setError(err.message));
  }, []);

  const rows = useMemo(() => {
    if (!matrix) return [];
    const domains = new Map<string, string[]>();
    for (const key of Object.keys(matrix.permissions).sort()) {
      const domain = key.split('.')[0];
      if (!domains.has(domain)) domains.set(domain, []);
      domains.get(domain)!.push(key);
    }
    const out: { domain: string; key: string; access: string }[] = [];
    for (const [domain, keys] of domains) {
      for (const key of keys) {
        if (filter && !key.includes(filter)) continue;
        if (onlyMine && !permissions.has(key)) continue;
        out.push({ domain, key, access: matrix.permissions[key] });
      }
    }
    return out;
  }, [matrix, filter, onlyMine, permissions]);

  if (error) return <ErrorBanner error={error} />;
  if (!matrix) return <div className="text-sm text-slate-500">Loading matrix…</div>;

  let lastDomain = '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permission matrix"
        subtitle="Read-only render of the matrix the backend actually enforces. Nothing on this page can change it — that lives in code, under review."
      />

      <Card>
        <Table
          columns={['Permission', ...matrix.roles.map((r) => ROLE_LABELS[r] || r)]}
          rows={[
            [
              <strong key="h" className="text-xs uppercase tracking-wide text-slate-500">
                Total granted
              </strong>,
              ...matrix.roles.map((r) => (
                <span key={r} className="text-sm font-bold text-slate-800">
                  {matrix.census[r]?.total ?? '—'}
                </span>
              )),
            ],
          ]}
        />
      </Card>

      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-700">Filter permissions</span>
            <input
              className={inputClass}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="withdrawal, refund, vendor…"
            />
          </label>
          <label className="flex items-end gap-2 pb-2 text-sm text-slate-700">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} className="h-4 w-4" />
            Only the {permissions.size} I hold
          </label>
          <div className="flex items-end gap-3 pb-2 text-xs text-slate-500">
            {Object.entries(CELL).map(([k, v]) => (
              <span key={k} className="inline-flex items-center gap-1">
                <span className={`inline-grid h-5 w-5 place-items-center rounded text-xs font-bold ${v.cls}`}>{v.label}</span>
                {v.title}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left">
              <th className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">Permission</th>
              {matrix.roles.map((r) => (
                <th key={r} className="px-2 py-2 text-center text-xs font-bold uppercase tracking-wide text-slate-500">
                  {ROLE_LABELS[r] || r}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ domain, key, access }) => {
              const showDomain = domain !== lastDomain;
              lastDomain = domain;
              return (
                <Fragment key={key}>
                  {showDomain && (
                    <tr className="bg-slate-50">
                      <td colSpan={matrix.roles.length + 1} className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                        {domain}
                      </td>
                    </tr>
                  )}
                  <tr className="border-b border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-1.5">
                      <code className="text-xs text-slate-700">{key}</code>
                      {permissions.has(key) && (
                        <span className="ml-2 rounded bg-ore-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-ore-700">you</span>
                      )}
                    </td>
                    {matrix.roles.map((_, i) => {
                      const c = CELL[access[i]] || CELL['-'];
                      return (
                        <td key={i} className="px-2 py-1.5 text-center" title={c.title}>
                          <span className={`inline-grid h-5 w-5 place-items-center rounded text-xs font-bold ${c.cls}`}>
                            {c.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">No permission matches that filter.</p>}
      </Card>

      <p className="text-xs text-slate-500">
        ⚖ marks a dual-controlled action: holding it lets an admin <em>propose</em>, not execute — a second approver has to
        countersign. Super Admin is a column here, not an override: anything shown as · is refused for everyone.
      </p>
    </div>
  );
}
