'use client';

import { Card, ErrorBanner, PageHeader, Pill, PromptForm, Table, statusTone } from '@/components/ui';
import { gw, post } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';

type Rider = {
  id: string;
  name: string;
  phone: string;
  status: string;
  verified: boolean;
  vehicle: string;
  licensePlate: string | null;
  riderIdentifier: string | null;
  codTier: string;
  codStatus: string;
  codBlocked: boolean;
  completedDeliveries: number;
  rating: number;
  reliabilityScore: number;
};

export default function RidersPage() {
  const [rows, setRows] = useState<Rider[]>([]);
  const [filteredRows, setFilteredRows] = useState<Rider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    gw<Rider[]>('dispatch/admin/riders')
      .then((data) => {
        setRows(data || []);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Handle client-side search & filtering
  useEffect(() => {
    let result = rows;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          (r.riderIdentifier || '').toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      );
    }

    if (vehicleFilter) {
      result = result.filter((r) => r.vehicle === vehicleFilter);
    }

    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }

    setFilteredRows(result);
  }, [searchQuery, vehicleFilter, statusFilter, rows]);

  async function executeAction(actionFn: () => Promise<unknown>) {
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
  const activeCount = rows.filter((r) => r.status === 'AVAILABLE' || r.status === 'ASSIGNED' || r.status === 'DELIVERING').length;
  const offlineCount = rows.filter((r) => r.status === 'OFFLINE').length;
  const codBlockedCount = rows.filter((r) => r.codBlocked).length;
  const pendingVettingCount = rows.filter((r) => !r.verified).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Rider Dispatch & COD Cash-Control"
        subtitle="Approve verified couriers, adjust trust/errand limits, and audit COD warnings or remittance ladders."
        actions={
          <button
            onClick={load}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Refresh Courier Fleet
          </button>
        }
      />

      <ErrorBanner error={error} />

      {/* Metrics Section */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active & En Route</div>
            <div className="mt-2 text-3xl font-extrabold text-emerald-600">{activeCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Couriers currently online</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Vetting</div>
            <div className="mt-2 text-3xl font-extrabold text-amber-600">{pendingVettingCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Awaiting fleet verification</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">COD Cash Blocked</div>
            <div className="mt-2 text-3xl font-extrabold text-red-600">{codBlockedCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Exceeding safe exposure threshold</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Offline couriers</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">{offlineCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Total registered fleet: {rows.length}</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9" />
            </svg>
          </div>
        </Card>
      </div>

      {/* Dynamic Filters */}
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
                placeholder="Search courier name, phone, ID..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-ore-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ore-600 transition-all"
              />
            </div>

            {/* Filter by Vehicle Type */}
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
            >
              <option value="">All Vehicles</option>
              <option value="BICYCLE">Bicycle</option>
              <option value="MOTORBIKE">Motorbike</option>
              <option value="CAR">Car</option>
            </select>

            {/* Filter by Active Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Online & Available</option>
              <option value="OFFLINE">Offline</option>
              <option value="PAUSED">Paused</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="DELIVERING">Delivering</option>
            </select>
          </div>

          <div className="text-xs text-slate-400 font-semibold uppercase">
            FLEET SIZE: {filteredRows.length} RIDERS
          </div>
        </div>
      </Card>

      {/* Main Riders Grid */}
      <Card className="overflow-hidden bg-white shadow-sm border border-slate-200">
        <Table
          columns={['Courier Profile', 'Active Status', 'COD Cash Eligibility & Status', 'Trips Count', 'Reliability', 'Operations Console Panel']}
          rows={filteredRows.map((r) => [
            /* Courier details */
            <div key={r.id}>
              <div className="font-bold text-slate-900">{r.name}</div>
              <div className="text-xs text-slate-500 font-medium">{r.phone} · {r.vehicle} <span className="font-semibold text-slate-700">{r.licensePlate || ''}</span></div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{r.riderIdentifier || r.id}</div>
            </div>,

            /* Online status and verification */
            <div key="st" className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${
                  r.status === 'AVAILABLE' ? 'bg-emerald-500' : r.status === 'OFFLINE' ? 'bg-slate-300' : 'bg-amber-500'
                }`}></span>
                <span className="text-xs font-bold text-slate-600 uppercase">{r.status}</span>
              </div>
              <Pill tone={r.verified ? 'green' : 'amber'}>{r.verified ? 'Verified & Approved' : 'Unapproved'}</Pill>
            </div>,

            /* COD Limits and warnings */
            <div key="cod" className="space-y-1 text-xs">
              <div>
                <span className="font-semibold text-slate-700">Tier: </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600">{r.codTier}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-700">Status: </span>
                <span className={`font-bold ${
                  r.codStatus === 'CLEAR' ? 'text-emerald-700' : r.codStatus === 'WARNING' ? 'text-amber-700' : 'text-red-700'
                }`}>{r.codStatus}</span>
              </div>
              {r.codBlocked ? (
                <span className="inline-flex rounded-md bg-red-950/10 border border-red-900/10 px-2 py-0.5 text-[10px] font-bold text-red-700 uppercase tracking-wide">
                  COD Blocked (Overdue)
                </span>
              ) : (
                <span className="inline-flex rounded-md bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                  COD Eligible
                </span>
              )}
            </div>,

            /* Trip count */
            <span key="trips" className="font-bold text-slate-800">{r.completedDeliveries} deliveries</span>,

            /* Rating and reliability */
            <div key="score" className="text-xs space-y-0.5">
              <div className="flex items-center gap-1 text-amber-600 font-bold">
                <span className="text-sm">★</span>
                <span>{r.rating?.toFixed(1) || '5.0'}</span>
              </div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">
                Reliability: {((r.reliabilityScore || 1.0) * 100).toFixed(0)}%
              </div>
            </div>,

            /* Decisions & overrides console */
            <div key="a" className="flex flex-wrap gap-2 max-w-md">
              {!r.verified && (
                <button
                  disabled={busy}
                  onClick={() => executeAction(() => post(`dispatch/admin/riders/${r.id}/approve`, { verified: true }))}
                  className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-sm"
                >
                  Verify courier
                </button>
              )}
              <button
                disabled={busy}
                onClick={() => executeAction(() => post(`dispatch/admin/riders/${r.id}/cod-block`, { blocked: !r.codBlocked }))}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all shadow-sm ${
                  r.codBlocked
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100'
                }`}
              >
                {r.codBlocked ? 'Unlock COD' : 'Block COD'}
              </button>
              
              <PromptForm
                title="COD tier overrides"
                submitLabel="Apply Tier"
                fields={[
                  { name: 'tier', label: 'NEW | EXPERIENCED | SENIOR', required: true, placeholder: 'e.g. SENIOR' },
                  { name: 'reason', label: 'Operations Justification', required: true, placeholder: 'e.g. Courier completed 50 runs' },
                ]}
                onSubmit={(v) => executeAction(() => post(`dispatch/admin/riders/${r.id}/cod-tier`, { tier: v.tier, reason: v.reason }))}
              />
              
              <PromptForm
                title="COD Warning levels"
                submitLabel="Set Level"
                fields={[
                  { name: 'status', label: 'CLEAR | WARNING | SUSPENDED | INVESTIGATION | TERMINATED', required: true, placeholder: 'e.g. SUSPENDED' },
                  { name: 'reason', label: 'Compliance Audit Note', required: true, placeholder: 'e.g. Overdue net remit outstanding > 48h' },
                ]}
                onSubmit={(v) => executeAction(() => post(`dispatch/admin/riders/${r.id}/cod-status`, { status: v.status, reason: v.reason }))}
              />
            </div>,
          ])}
        />
      </Card>
    </div>
  );
}
