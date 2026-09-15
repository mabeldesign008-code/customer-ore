'use client';

import { Button, Card, ErrorBanner, PageHeader, Pill, PromptForm, Table, moneyCell, statusTone } from '@/components/ui';
import { gw, post } from '@/lib/api';
import { when } from '@/lib/format';
import { useCallback, useEffect, useState } from 'react';

type Row = {
  id: string;
  vendorId: string;
  payoutPesewas: number;
  grossPesewas: number;
  status: string;
  createdAt: string;
};

export default function SettlementsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    gw<Row[]>('ledger/admin/vendors/settlements')
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Vendor settlements"
        subtitle="Weekly vendor share. Run settle, then pay or reverse."
        actions={
          <div className="flex gap-2">
            <Button onClick={() => post('ledger/admin/vendors/settle').then(load)}>Run settlements</Button>
            <Button tone="ghost" onClick={load}>
              Refresh
            </Button>
          </div>
        }
      />
      <ErrorBanner error={error} />
      <Card>
        <Table
          columns={['Vendor', 'Gross', 'Payout', 'Status', 'When', '']}
          rows={rows.map((r) => [
            r.vendorId,
            moneyCell(r.grossPesewas),
            moneyCell(r.payoutPesewas),
            <Pill key="s" tone={statusTone(r.status)}>{r.status}</Pill>,
            when(r.createdAt),
            <div key="a" className="flex gap-2">
              <Button onClick={() => post(`ledger/admin/vendors/settlements/${r.id}/pay`, {}).then(load)}>Pay</Button>
              <PromptForm
                title="Reverse"
                submitLabel="Reverse"
                fields={[{ name: 'reason', label: 'Reason', required: true }]}
                onSubmit={(v) => post(`ledger/admin/vendors/settlements/${r.id}/reverse`, { reason: v.reason }).then(load)}
              />
            </div>,
          ])}
        />
      </Card>
    </div>
  );
}
