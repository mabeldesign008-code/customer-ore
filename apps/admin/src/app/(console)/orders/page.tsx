'use client';

import { Card, ErrorBanner, PageHeader, Pill, PromptForm, Table, moneyCell, statusTone } from '@/components/ui';
import { gw, post } from '@/lib/api';
import { when } from '@/lib/format';
import { useCallback, useEffect, useState } from 'react';

type Order = {
  id: string;
  ref: string;
  status: string;
  vendorName: string;
  customerId: string;
  paymentMethod: string;
  totalPesewas: number;
  createdAt: string;
  riderId: string | null;
};

export default function OrdersPage() {
  const [rows, setRows] = useState<Order[]>([]);
  const [filteredRows, setFilteredRows] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const q = statusFilter ? `?status=${encodeURIComponent(statusFilter)}&limit=100` : '?limit=100';
    gw<{ orders: Order[] }>(`order/admin/orders${q}`)
      .then((d) => {
        setRows(d.orders || []);
      })
      .catch((err: Error) => setError(err.message));
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Client-side text search filter (ref, vendor name, rider ID, customer ID)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRows(rows);
      return;
    }
    const q = searchQuery.toLowerCase();
    const result = rows.filter(
      (o) =>
        o.ref.toLowerCase().includes(q) ||
        o.vendorName.toLowerCase().includes(q) ||
        (o.riderId || '').toLowerCase().includes(q) ||
        o.customerId.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
    );
    setFilteredRows(result);
  }, [searchQuery, rows]);

  async function runAction(actionFn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await actionFn();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  // Compute metrics
  const activeCount = rows.filter((o) =>
    ['CONFIRMED', 'ACCEPTED', 'PREPARING', 'READY_FOR_PICKUP', 'RIDER_ASSIGNED', 'OUT_FOR_DELIVERY'].includes(o.status)
  ).length;
  const pendingPaymentCount = rows.filter((o) => o.status === 'PENDING_PAYMENT').length;
  const deliveredCount = rows.filter((o) => o.status === 'DELIVERED').length;
  const waitingRiderCount = rows.filter((o) => o.status === 'WAITING_FOR_RIDER').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Live Order Tracking & Manual Dispatch"
        subtitle="Monitor active order lifecycle across Cape Coast, force-assign drivers, or trigger emergency cancellations."
        actions={
          <button
            onClick={load}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Refresh Live Orders
          </button>
        }
      />

      <ErrorBanner error={error} />

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Deliveries</div>
            <div className="mt-2 text-3xl font-extrabold text-emerald-600">{activeCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">In progress on the road</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.129-1.125V11.25M3 14.25h11.25m0 0V4.875c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125V11.25M3 14.25V7.5a2.25 2.25 0 0 1 2.25-2.25h1.5M14.25 14.25h5.25M16.5 9h2.25" />
            </svg>
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">No Rider Found</div>
            <div className="mt-2 text-3xl font-extrabold text-red-600">{waitingRiderCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Waiting in dispatch loop</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Payment</div>
            <div className="mt-2 text-3xl font-extrabold text-amber-600">{pendingPaymentCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Awaiting webhook callback</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
            </svg>
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Delivered (Today)</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">{deliveredCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Total in queue: {rows.length}</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
        </Card>
      </div>

      {/* Advanced Filters */}
      <Card className="p-4 bg-white shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative w-full max-w-xs">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.604 10.607Z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ref, merchant, customer, rider ID..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-ore-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ore-600 transition-all"
              />
            </div>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="CONFIRMED">Confirmed / Paid</option>
              <option value="ACCEPTED">Vendor Accepted</option>
              <option value="PREPARING">Preparing (Kitchen)</option>
              <option value="WAITING_FOR_RIDER">Waiting for Rider</option>
              <option value="RIDER_ASSIGNED">Rider Assigned</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="PENDING_PAYMENT">Pending Payment</option>
            </select>
          </div>

          <div className="text-xs text-slate-400 font-semibold uppercase">
            Showing {filteredRows.length} active orders
          </div>
        </div>
      </Card>

      {/* Main Table */}
      <Card className="overflow-hidden bg-white shadow-sm border border-slate-200">
        <Table
          columns={['Ref Code', 'Merchant Store', 'Payment Type', 'Status', 'Total Price', 'Placed Time', 'Dispatcher Override Controls']}
          rows={filteredRows.map((o) => [
            /* Ref code */
            <div key={o.id}>
              <div className="font-bold text-slate-900">{o.ref}</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{o.id}</div>
            </div>,

            /* Merchant details */
            <div key="v">
              <div className="font-semibold text-slate-800">{o.vendorName}</div>
              <div className="text-[10px] text-slate-500 font-medium">customer {o.customerId.slice(0, 8)}...</div>
            </div>,

            /* Payment method */
            <span key="pay" className="text-xs font-semibold text-slate-600">{o.paymentMethod}</span>,

            /* Status badge */
            <Pill key="s" tone={statusTone(o.status)}>{o.status}</Pill>,

            /* Price */
            moneyCell(o.totalPesewas),

            /* Created time */
            <span key="date" className="text-xs text-slate-500 font-medium">{when(o.createdAt)}</span>,

            /* Controls */
            <div key="a" className="flex flex-wrap gap-2">
              <PromptForm
                title="Cancel order"
                submitLabel="Force Cancel"
                fields={[
                  { name: 'reason', label: 'Operations Cancellation Reason', required: true, placeholder: 'e.g. Customer unreachable / out of area' }
                ]}
                onSubmit={(v) => runAction(() => post(`order/admin/orders/${o.id}/cancel`, { reason: v.reason }))}
              />
              
              <PromptForm
                title="Force assign courier"
                submitLabel="Force Assign"
                fields={[
                  { name: 'riderId', label: 'Rider Profile ID (UUID)', required: true, placeholder: 'Paste courier uuid...' },
                  { name: 'reason', label: 'Operations Justification', required: true, placeholder: 'e.g. Manual dispatch backup override' }
                ]}
                onSubmit={(v) => runAction(() => post(`dispatch/admin/orders/${o.id}/assign`, { riderId: v.riderId, reason: v.reason }))}
              />
            </div>,
          ])}
        />
      </Card>
    </div>
  );
}
