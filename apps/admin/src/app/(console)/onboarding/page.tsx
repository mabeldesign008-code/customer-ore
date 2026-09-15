'use client';

import { Card, ErrorBanner, PageHeader, Pill, Table, statusTone } from '@/components/ui';
import { gw } from '@/lib/api';
import { when } from '@/lib/format';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type AppRow = {
  id: string;
  kind: string;
  status: string;
  applicantPhone: string;
  applicantName: string | null;
  businessName: string | null;
  smileIdStatus: string;
  currentStage: number;
  maxStages: number;
  createdAt: string;
};

export default function OnboardingPage() {
  const [rows, setRows] = useState<AppRow[]>([]);
  const [filteredRows, setFilteredRows] = useState<AppRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('PENDING_REVIEW');
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(() => {
    const q = new URLSearchParams();
    if (status) q.set('status', status);
    if (kind) q.set('kind', kind);
    gw<AppRow[]>(`onboarding/admin/applications?${q.toString()}`)
      .then((data) => {
        setRows(data || []);
      })
      .catch((err: Error) => setError(err.message));
  }, [kind, status]);

  useEffect(() => {
    load();
  }, [load]);

  // Handle client-side text search (name, phone, business)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRows(rows);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = rows.filter((r) => {
      const name = (r.applicantName || '').toLowerCase();
      const business = (r.businessName || '').toLowerCase();
      const phone = (r.applicantPhone || '').toLowerCase();
      const id = r.id.toLowerCase();
      return name.includes(query) || business.includes(query) || phone.includes(query) || id.includes(query);
    });
    setFilteredRows(filtered);
  }, [searchQuery, rows]);

  // Compute metrics from current rows
  const pendingCount = rows.filter((r) => r.status === 'PENDING_REVIEW').length;
  const requiresActionCount = rows.filter((r) => r.status === 'REQUIRES_ACTION').length;
  const draftCount = rows.filter((r) => r.status === 'DRAFT').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Compliance & Onboarding Vetting"
        subtitle="Vet rider and vendor credentials, review SmileID KYC reports, and issue official platform IDs."
        actions={
          <button
            onClick={load}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Refresh List
          </button>
        }
      />

      <ErrorBanner error={error} />

      {/* Metrics Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Review</div>
            <div className="mt-2 text-3xl font-extrabold text-amber-600">{pendingCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Requires active vetting</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Action Required</div>
            <div className="mt-2 text-3xl font-extrabold text-blue-600">{requiresActionCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Awaiting applicant corrections</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Draft Applications</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-600">{draftCount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Unsubmitted drafts</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
        </Card>

        <Card className="p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total in Queue</div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900">{rows.length}</div>
            <div className="text-[10px] text-slate-400 mt-1">Filtered from database</div>
          </div>
          <div className="h-10 w-10 rounded-full bg-ore-50 flex items-center justify-center text-ore-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0 1 10.089 18H8.25c-4.321 0-7.85-3.411-7.994-7.693A1.125 1.125 0 0 1 1.125 9H12M21 12c0-1.268-.63-2.39-1.593-3.068a3.745 3.745 0 0 0-1.043-3.296 3.745 3.745 0 0 0-3.296-1.043A3.745 3.745 0 0 0 12 3c-1.268 0-2.39.63-3.068 1.593a3.746 3.746 0 0 0-3.296 1.043 3.746 3.746 0 0 0-1.043 3.296A3.745 3.745 0 0 0 3 12c0 1.268.63 2.39 1.593 3.068a3.746 3.746 0 0 0 1.043 3.296 3.746 3.746 0 0 0 3.296 1.043A3.746 3.746 0 0 0 12 21c1.268 0 2.39-.63 3.068-1.593a3.746 3.746 0 0 0 3.296-1.043 3.746 3.746 0 0 0 1.043-3.296A3.745 3.745 0 0 0 21 12Z" />
            </svg>
          </div>
        </Card>
      </div>

      {/* Filtering Section */}
      <Card className="p-4 bg-white shadow-sm border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            {/* Search Input */}
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
                placeholder="Search name, phone, business..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-ore-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-ore-600 transition-all"
              />
            </div>

            {/* Filter by Kind */}
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
            >
              <option value="">All App Types</option>
              <option value="RIDER">Rider App</option>
              <option value="VENDOR">Vendor App</option>
            </select>

            {/* Filter by Status */}
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none hover:bg-slate-100 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="REQUIRES_ACTION">Requires Action</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          <div className="text-xs text-slate-400 font-semibold uppercase">
            Showing {filteredRows.length} applications
          </div>
        </div>
      </Card>

      {/* Main List */}
      <Card className="overflow-hidden bg-white shadow-sm border border-slate-200">
        <Table
          columns={['Applicant / Business', 'Type', 'Status', 'SmileID Status', 'Stage Progress', 'Submitted', 'Action']}
          rows={filteredRows.map((r) => {
            const initials = ((r.businessName || r.applicantName || 'O').slice(0, 2)).toUpperCase();
            const avatarColor = r.kind === 'RIDER' ? 'bg-ore-100 text-ore-700' : 'bg-emerald-100 text-emerald-700';
            
            return [
              <div key={r.id} className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full ${avatarColor} flex items-center justify-center font-bold text-xs`}>
                  {initials}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{r.businessName || r.applicantName || 'Unnamed Applicant'}</div>
                  <div className="text-xs text-slate-500 font-medium">{r.applicantPhone}</div>
                </div>
              </div>,
              <div key="k">
                <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
                  r.kind === 'RIDER' ? 'bg-purple-50 text-purple-700 border border-purple-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                }`}>
                  {r.kind}
                </span>
              </div>,
              <Pill key="s" tone={statusTone(r.status)}>{r.status}</Pill>,
              <div key="smile" className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${
                  r.smileIdStatus === 'APPROVED' ? 'bg-emerald-500' : r.smileIdStatus === 'PROCESSING' ? 'bg-amber-500' : 'bg-slate-300'
                }`}></span>
                <span className="text-xs font-medium text-slate-600">{r.smileIdStatus}</span>
              </div>,
              <div key="p" className="space-y-1 w-24">
                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                  <span>Stage {r.currentStage}/{r.maxStages}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-ore-600 transition-all duration-300"
                    style={{ width: `${(r.currentStage / r.maxStages) * 100}%` }}
                  ></div>
                </div>
              </div>,
              <span key="date" className="text-xs text-slate-500 font-medium">{when(r.createdAt)}</span>,
              <Link
                key="l"
                href={`/onboarding/${r.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-ore-700 shadow-sm hover:bg-slate-50 transition-colors"
              >
                Vet Application
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-3 w-3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </Link>,
            ];
          })}
        />
      </Card>
    </div>
  );
}
