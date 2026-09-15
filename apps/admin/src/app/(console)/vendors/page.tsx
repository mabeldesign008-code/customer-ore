'use client';

import { Button, Card, ErrorBanner, PageHeader, Pill, PromptForm, Table, moneyCell, statusTone } from '@/components/ui';
import { gw, post } from '@/lib/api';
import { when } from '@/lib/format';
import { useCallback, useEffect, useState } from 'react';

type Penalty = {
  id: string;
  vendorId: string;
  level: string;
  trigger: string;
  amountPesewas: number;
  active: boolean;
  createdAt: string;
};
type Violation = { id: string; vendorId: string; type: string; note: string; createdAt: string };

export default function VendorsPage() {
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([gw<Penalty[]>('catalog/admin/penalties'), gw<Violation[]>('catalog/admin/violations')])
      .then(([p, v]) => {
        setPenalties(p);
        setViolations(v);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="SLA penalties and violations. Catalogue types: FOOD, GROCERY, MARKET, PHARMACY, SHOP, LAUNDRY."
        actions={
          <div className="flex gap-2">
            <PromptForm
              title="Apply penalty"
              submitLabel="Apply"
              fields={[
                { name: 'vendorId', label: 'Vendor id', required: true },
                { name: 'level', label: 'WARNING | FINANCIAL | SUSPENSION_24H | SUSPENSION_72H | SUSPENSION_7D | PERMANENT', required: true },
                { name: 'trigger', label: 'Trigger', required: true },
                { name: 'amountPesewas', label: 'Amount pesewas (FINANCIAL)', type: 'number' },
                { name: 'note', label: 'Note' },
              ]}
              onSubmit={(v) =>
                post(`catalog/admin/vendors/${v.vendorId}/penalties`, {
                  level: v.level,
                  trigger: v.trigger,
                  amountPesewas: v.amountPesewas ? Number(v.amountPesewas) : undefined,
                  note: v.note || undefined,
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
      <Card className="mb-6">
        <div className="border-b border-slate-100 px-4 py-3 font-semibold">Penalties</div>
        <Table
          columns={['Vendor', 'Level', 'Trigger', 'Amount', 'Active', '']}
          rows={penalties.map((p) => [
            p.vendorId,
            <Pill key="l" tone={statusTone(p.level)}>{p.level}</Pill>,
            p.trigger,
            moneyCell(p.amountPesewas),
            p.active ? 'yes' : 'no',
            p.active ? (
              <Button key="lift" tone="ghost" onClick={() => post(`catalog/admin/penalties/${p.id}/lift`).then(load)}>
                Lift
              </Button>
            ) : (
              '—'
            ),
          ])}
        />
      </Card>
      <Card>
        <div className="border-b border-slate-100 px-4 py-3 font-semibold">Violations</div>
        <Table
          columns={['Vendor', 'Type', 'Note', 'When']}
          rows={violations.map((v) => [v.vendorId, v.type, v.note, when(v.createdAt)])}
        />
      </Card>
    </div>
  );
}
