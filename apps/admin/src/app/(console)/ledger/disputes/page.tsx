'use client';

import { Button, Card, ErrorBanner, PageHeader, Pill, PromptForm, Table, statusTone } from '@/components/ui';
import { gw, post } from '@/lib/api';
import { when } from '@/lib/format';
import { useCallback, useEffect, useState } from 'react';

type Row = {
  id: string;
  orderId: string;
  customerId: string;
  vendorId: string;
  reason: string;
  status: string;
  createdAt: string;
};

export default function DisputesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    gw<Row[]>('ledger/admin/disputes')
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Disputes" subtitle="Refunds default to wallet credit. No double refund with chargebacks." actions={<Button tone="ghost" onClick={load}>Refresh</Button>} />
      <ErrorBanner error={error} />
      <Card>
        <Table
          columns={['Order', 'Reason', 'Status', 'When', '']}
          rows={rows.map((r) => [
            <div key={r.id}>
              <div className="font-medium">{r.orderId}</div>
              <div className="text-xs text-slate-500">customer {r.customerId}</div>
            </div>,
            r.reason,
            <Pill key="s" tone={statusTone(r.status)}>{r.status}</Pill>,
            when(r.createdAt),
            <PromptForm
              key="r"
              title="Resolve"
              submitLabel="Resolve"
              fields={[
                { name: 'decision', label: 'refund_full | refund_partial | no_refund', required: true },
                { name: 'fault', label: 'VENDOR | RIDER | PLATFORM | CUSTOMER' },
                { name: 'amountPesewas', label: 'Amount pesewas (partial)', type: 'number' },
                { name: 'refundMethod', label: 'WALLET | ORIGINAL' },
                { name: 'note', label: 'Note' },
              ]}
              onSubmit={(v) =>
                post(`ledger/admin/disputes/${r.id}/resolve`, {
                  decision: v.decision,
                  fault: v.fault || undefined,
                  amountPesewas: v.amountPesewas ? Number(v.amountPesewas) : undefined,
                  refundMethod: v.refundMethod || undefined,
                  note: v.note || undefined,
                }).then(load)
              }
            />,
          ])}
        />
      </Card>
    </div>
  );
}
