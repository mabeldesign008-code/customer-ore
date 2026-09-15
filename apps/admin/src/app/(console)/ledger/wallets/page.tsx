'use client';

import { Button, Card, ErrorBanner, PageHeader, PromptForm, Table, moneyCell } from '@/components/ui';
import { gw, post } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';

type Wallet = {
  riderId: string;
  pendingPesewas: number;
  clearedPesewas: number;
  lockedPesewas: number;
  cashOwedPesewas: number;
};

export default function WalletsPage() {
  const [rows, setRows] = useState<Wallet[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    gw<Wallet[]>('ledger/admin/wallets')
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Rider wallets" subtitle="Available payout = cleared − COD cash − locked. Tip is 100% rider." actions={<Button tone="ghost" onClick={load}>Refresh</Button>} />
      <ErrorBanner error={error} />
      <Card>
        <Table
          columns={['Rider', 'Pending', 'Cleared', 'Locked', 'COD owed', '']}
          rows={rows.map((w) => [
            w.riderId,
            moneyCell(w.pendingPesewas),
            moneyCell(w.clearedPesewas),
            moneyCell(w.lockedPesewas),
            moneyCell(w.cashOwedPesewas),
            <PromptForm
              key={w.riderId}
              title="Adjust"
              submitLabel="Apply"
              fields={[
                { name: 'amountPesewas', label: 'Amount pesewas', type: 'number', required: true },
                { name: 'kind', label: 'credit_cleared | penalty | reversal', required: true },
                { name: 'reason', label: 'Reason', required: true },
              ]}
              onSubmit={(v) =>
                post(`ledger/admin/wallets/${w.riderId}/adjust`, {
                  amountPesewas: Number(v.amountPesewas),
                  kind: v.kind,
                  reason: v.reason,
                }).then(load)
              }
            />,
          ])}
        />
      </Card>
    </div>
  );
}
