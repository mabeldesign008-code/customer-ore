'use client';

import { Card, ErrorBanner, PageHeader, Pill, Table, moneyCell, statusTone } from '@/components/ui';
import { gw } from '@/lib/api';
import { money } from '@/lib/format';
import { useEffect, useState } from 'react';

type Stats = {
  riders: { total: number; approved: number; pending: number };
  vendors: { total: number; approved: number; pending: number };
  overall: { totalPending: number };
};
type Analytics = {
  wallets?: { activeRiderWallets?: number; pendingWithdrawals?: number };
  vendors?: { pendingSettlements?: number };
};
type Orders = { orders: { id: string; ref: string; status: string; vendorName: string; totalPesewas: number }[] };

export default function OverviewPage() {
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [orders, setOrders] = useState<Orders['orders']>([]);

  useEffect(() => {
    Promise.all([
      gw<Stats>('onboarding/admin/stats'),
      gw<Analytics>('ledger/admin/analytics?period=week'),
      gw<Orders>('order/admin/orders?limit=8'),
    ])
      .then(([s, a, o]) => {
        setStats(s);
        setAnalytics(a);
        setOrders(o.orders || []);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const tiles = [
    { label: 'Pending KYC', value: stats?.overall.totalPending ?? '—' },
    { label: 'Riders approved', value: stats?.riders.approved ?? '—' },
    { label: 'Vendors approved', value: stats?.vendors.approved ?? '—' },
    { label: 'Pending withdrawals', value: analytics?.wallets?.pendingWithdrawals ?? '—' },
    { label: 'Settlements ready', value: analytics?.vendors?.pendingSettlements ?? '—' },
    { label: 'Rider wallets', value: analytics?.wallets?.activeRiderWallets ?? '—' },
  ];

  return (
    <div>
      <PageHeader title="Overview" subtitle="Live figures from onboarding, ledger and orders." />
      <ErrorBanner error={error} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Card key={t.label} className="p-5">
            <div className="text-sm text-slate-500">{t.label}</div>
            <div className="mt-2 text-2xl font-bold">{t.value}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">Recent orders</div>
        <Table
          columns={['Ref', 'Vendor', 'Status', 'Total']}
          rows={orders.map((o) => [
            o.ref,
            o.vendorName,
            <Pill key={o.id} tone={statusTone(o.status)}>{o.status}</Pill>,
            moneyCell(o.totalPesewas),
          ])}
        />
      </Card>
      <p className="mt-4 text-xs text-slate-400">Tip is 100% rider. Peak pay is platform-funded, 100% rider. {money(0)} shown from integer pesewas.</p>
    </div>
  );
}
