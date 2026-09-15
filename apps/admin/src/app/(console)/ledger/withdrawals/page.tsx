'use client';

import { Button, Card, ErrorBanner, PageHeader, Pill, PromptForm, Table, moneyCell, statusTone } from '@/components/ui';
import { gw, post } from '@/lib/api';
import { when } from '@/lib/format';
import { useCallback, useEffect, useState } from 'react';

type Row = {
  id: string;
  riderId: string;
  amountPesewas: number;
  feePesewas: number;
  destination: string;
  status: string;
  createdAt: string;
};

export default function WithdrawalsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    gw<Row[]>('ledger/admin/withdrawals')
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Withdrawals" subtitle="Approve pays out via Paystack Transfers (mock completes instantly)." actions={<Button tone="ghost" onClick={load}>Refresh</Button>} />
      <ErrorBanner error={error} />
      <Card>
        <Table
          columns={['Rider', 'Amount', 'Fee', 'Destination', 'Status', 'When', '']}
          rows={rows.map((r) => [
            r.riderId,
            moneyCell(r.amountPesewas),
            moneyCell(r.feePesewas),
            r.destination,
            <Pill key="s" tone={statusTone(r.status)}>{r.status}</Pill>,
            when(r.createdAt),
            r.status === 'REQUESTED' ? (
              <div key="a" className="flex gap-2">
                <Button onClick={() => post(`ledger/admin/withdrawals/${r.id}/approve`).then(load)}>Approve</Button>
                <PromptForm
                  title="Reject"
                  submitLabel="Reject"
                  fields={[{ name: 'note', label: 'Note' }]}
                  onSubmit={(v) => post(`ledger/admin/withdrawals/${r.id}/reject`, { note: v.note || undefined }).then(load)}
                />
              </div>
            ) : (
              '—'
            ),
          ])}
        />
      </Card>
    </div>
  );
}
