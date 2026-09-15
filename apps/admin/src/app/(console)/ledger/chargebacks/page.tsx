'use client';

import { Button, Card, ErrorBanner, PageHeader, Pill, PromptForm, Table, moneyCell, statusTone } from '@/components/ui';
import { gw, post } from '@/lib/api';
import { when } from '@/lib/format';
import { useCallback, useEffect, useState } from 'react';

type Row = {
  id: string;
  orderId: string;
  reference: string;
  amountPesewas: number;
  status: string;
  createdAt: string;
};

export default function ChargebacksPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    gw<Row[]>('ledger/admin/chargebacks')
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Chargebacks"
        subtitle="Bank claims. Lost chargebacks block a second dispute refund."
        actions={
          <div className="flex gap-2">
            <PromptForm
              title="Open chargeback"
              submitLabel="Open"
              fields={[
                { name: 'orderId', label: 'Order id', required: true },
                { name: 'reference', label: 'PSP reference', required: true },
                { name: 'amountPesewas', label: 'Amount pesewas', type: 'number', required: true },
                { name: 'reason', label: 'Reason', required: true },
              ]}
              onSubmit={(v) =>
                post('ledger/admin/chargebacks', {
                  orderId: v.orderId,
                  reference: v.reference,
                  amountPesewas: Number(v.amountPesewas),
                  reason: v.reason,
                }).then(load)
              }
            />
            <Button tone="ghost" onClick={load}>
              Refresh
            </Button>
          </div>
        }
      />
      <ErrorBanner error={error} />
      <Card>
        <Table
          columns={['Order', 'Reference', 'Amount', 'Status', 'When', '']}
          rows={rows.map((r) => [
            r.orderId,
            r.reference,
            moneyCell(r.amountPesewas),
            <Pill key="s" tone={statusTone(r.status)}>{r.status}</Pill>,
            when(r.createdAt),
            <PromptForm
              key="r"
              title="Resolve"
              submitLabel="Resolve"
              fields={[
                { name: 'outcome', label: 'won | lost', required: true },
                { name: 'fault', label: 'VENDOR | RIDER | PLATFORM | CUSTOMER' },
                { name: 'feesPesewas', label: 'Fees pesewas', type: 'number' },
                { name: 'note', label: 'Note' },
              ]}
              onSubmit={(v) =>
                post(`ledger/admin/chargebacks/${r.id}/resolve`, {
                  outcome: v.outcome,
                  fault: v.fault || undefined,
                  feesPesewas: v.feesPesewas ? Number(v.feesPesewas) : undefined,
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
