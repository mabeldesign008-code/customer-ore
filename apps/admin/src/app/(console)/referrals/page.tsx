'use client';

import { Button, Card, ErrorBanner, PageHeader, Pill, PromptForm, Table, statusTone } from '@/components/ui';
import { gw, post } from '@/lib/api';
import { when } from '@/lib/format';
import { useCallback, useEffect, useState } from 'react';

type Row = {
  id: string;
  code: string;
  status: string;
  refereePhone: string;
  createdAt: string;
};

export default function ReferralsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    gw<Row[]>('referral/admin/referrals')
      .then(setRows)
      .catch((err: Error) => setError(err.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Referrals" subtitle="Block abusive codes. Reward is customer credit after a delivered order." actions={<Button tone="ghost" onClick={load}>Refresh</Button>} />
      <ErrorBanner error={error} />
      <Card>
        <Table
          columns={['Code', 'Referee', 'Status', 'When', '']}
          rows={rows.map((r) => [
            r.code,
            r.refereePhone,
            <Pill key="s" tone={statusTone(r.status)}>{r.status}</Pill>,
            when(r.createdAt),
            <PromptForm
              key="b"
              title="Block"
              submitLabel="Block"
              fields={[{ name: 'reason', label: 'Reason', required: true }]}
              onSubmit={(v) => post(`referral/admin/referrals/${r.id}/block`, { reason: v.reason }).then(load)}
            />,
          ])}
        />
      </Card>
    </div>
  );
}
