'use client';

import { Button, Card, ErrorBanner, Field, PageHeader, Table, inputClass, moneyCell } from '@/components/ui';
import { gw, post } from '@/lib/api';
import { when } from '@/lib/format';
import { FormEvent, useState } from 'react';

type Statement = {
  balance: { creditPesewas: number; lifetimeCreditedPesewas: number; lifetimeUsedPesewas: number };
  log: { id: string; amountPesewas: number; reason: string; createdAt: string; ref: string }[];
};

export default function CreditPage() {
  const [userId, setUserId] = useState('');
  const [stmt, setStmt] = useState<Statement | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setStmt(await gw<Statement>(`ledger/admin/customers/${userId}/credit`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    }
  }

  async function grant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    try {
      await post(`ledger/admin/customers/${userId}/credit`, {
        amountPesewas: Number(fd.get('amountPesewas')),
        reason: String(fd.get('reason') || ''),
      });
      setStmt(await gw<Statement>(`ledger/admin/customers/${userId}/credit`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grant failed');
    }
  }

  return (
    <div>
      <PageHeader title="Customer credit" subtitle="Wallet-first refunds land here. Amounts are pesewas." />
      <ErrorBanner error={error} />
      <Card className="mb-6 p-5">
        <form onSubmit={lookup} className="flex max-w-xl gap-2">
          <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="Customer user id" className={inputClass} required />
          <Button type="submit">Load</Button>
        </form>
      </Card>
      {stmt ? (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <div className="text-sm text-slate-500">Balance</div>
              <div className="mt-1 text-xl font-bold">{moneyCell(stmt.balance.creditPesewas)}</div>
            </Card>
            <Card className="p-5">
              <div className="text-sm text-slate-500">Lifetime credited</div>
              <div className="mt-1 text-xl font-bold">{moneyCell(stmt.balance.lifetimeCreditedPesewas)}</div>
            </Card>
            <Card className="p-5">
              <div className="text-sm text-slate-500">Lifetime used</div>
              <div className="mt-1 text-xl font-bold">{moneyCell(stmt.balance.lifetimeUsedPesewas)}</div>
            </Card>
          </div>
          <Card className="mb-6 p-5">
            <form onSubmit={grant} className="grid max-w-xl gap-3">
              <Field label="Grant pesewas">
                <input name="amountPesewas" type="number" min={1} required className={inputClass} />
              </Field>
              <Field label="Reason">
                <input name="reason" required minLength={3} className={inputClass} />
              </Field>
              <Button type="submit">Grant credit</Button>
            </form>
          </Card>
          <Card>
            <Table
              columns={['When', 'Amount', 'Reason', 'Ref']}
              rows={stmt.log.map((l) => [when(l.createdAt), moneyCell(l.amountPesewas), l.reason, l.ref])}
            />
          </Card>
        </>
      ) : null}
    </div>
  );
}
