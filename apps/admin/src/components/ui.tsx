'use client';

import { FormEvent, ReactNode, useState } from 'react';
import { money, when } from '@/lib/format';

export function moneyCell(pesewas: number | null | undefined) {
  return money(pesewas);
}

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'amber' | 'red' | 'blue' }) {
  const map = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-800',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-ore-50 text-ore-700',
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}

export function statusTone(status: string): 'slate' | 'green' | 'amber' | 'red' | 'blue' {
  const s = status.toUpperCase();
  if (['APPROVED', 'DELIVERED', 'PAID', 'CLEAR', 'MATCHED', 'ACTIVE', 'CREDITED'].includes(s)) return 'green';
  if (['PENDING', 'PENDING_REVIEW', 'REQUESTED', 'READY', 'WARNING', 'PROCESSING', 'OPEN'].includes(s)) return 'amber';
  if (['REJECTED', 'CANCELLED', 'FAILED', 'TERMINATED', 'PERMANENT', 'LOST'].includes(s)) return 'red';
  if (['ASSIGNED', 'PREPARING', 'INVESTIGATING'].includes(s)) return 'blue';
  return 'slate';
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function Button({
  children,
  onClick,
  type = 'button',
  tone = 'primary',
  disabled,
  small = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  tone?: 'primary' | 'ghost' | 'danger' | 'secondary';
  disabled?: boolean;
  /** Compact variant for inline table actions. */
  small?: boolean;
}) {
  const map = {
    primary: 'bg-ore-600 text-white hover:bg-ore-700',
    secondary: 'bg-slate-900 text-white hover:bg-slate-800',
    ghost: 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  const size = small ? 'rounded-md px-2 py-1 text-xs' : 'rounded-lg px-3 py-2 text-sm';
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${size} font-semibold disabled:opacity-50 ${map[tone]}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-ore-600 focus:ring-2';

export function Table({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-slate-500" colSpan={columns.length}>
                No rows.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-3 align-middle">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
}

export function PromptForm({
  title,
  fields,
  submitLabel,
  onSubmit,
}: {
  title: string;
  fields: { name: string; label: string; type?: string; required?: boolean; placeholder?: string }[];
  submitLabel: string;
  onSubmit: (values: Record<string, string>) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values: Record<string, string> = {};
    for (const f of fields) values[f.name] = String(fd.get(f.name) || '');
    setBusy(true);
    setError(null);
    try {
      await onSubmit(values);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>{title}</Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <form onSubmit={handle} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold">{title}</h2>
            <ErrorBanner error={error} />
            {fields.map((f) => (
              <Field key={f.name} label={f.label}>
                <input
                  name={f.name}
                  type={f.type || 'text'}
                  required={f.required}
                  placeholder={f.placeholder}
                  className={inputClass}
                />
              </Field>
            ))}
            <div className="flex justify-end gap-2">
              <Button tone="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : submitLabel}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

export function fmtWhen(v: string | Date | null | undefined) {
  return when(v);
}
