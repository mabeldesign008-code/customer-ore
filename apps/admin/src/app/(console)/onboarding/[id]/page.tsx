'use client';

import { Button, Card, ErrorBanner, PageHeader, Pill, inputClass, statusTone } from '@/components/ui';
import { ApiError, gw, post } from '@/lib/api';
import { when } from '@/lib/format';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

type App = {
  id: string;
  kind: string;
  status: string;
  applicantPhone: string;
  applicantName: string | null;
  businessName: string | null;
  smileIdStatus: string;
  currentStage: number;
  maxStages: number;
  vendorType: string | null;
  vendorClass: string | null;
  vehicle: string | null;
  publicId: string | null;
  reason: string | null;
  requiresActionField: string | null;
  createdAt: string;
  stageData: Record<string, any>;
};

type AppDoc = {
  id: string;
  kind: string;
  fileName: string;
  contentType: string;
  createdAt: string;
};

type AuditLog = {
  id: string;
  reviewerId: string;
  reviewerRole: string;
  action: string;
  previousState: string;
  newState: string;
  reason: string | null;
  requiresActionField: string | null;
  createdAt: string;
};

export default function ApplicationDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [row, setRow] = useState<App | null>(null);
  const [docs, setDocs] = useState<AppDoc[]>([]);
  const [audits, setAudits] = useState<AuditLog[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Decisions form state
  const [reason, setReason] = useState('');
  const [field, setField] = useState('');
  const [message, setMessage] = useState('');
  const [stage, setStage] = useState('1');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setError(null);
    Promise.all([
      gw<App>(`onboarding/admin/applications/${id}`),
      gw<AppDoc[]>(`onboarding/admin/applications/${id}/documents`),
      gw<AuditLog[]>(`onboarding/admin/applications/${id}/audit-logs`),
    ])
      .then(([app, appDocs, appAudits]) => {
        setRow(app);
        setDocs(appDocs || []);
        setAudits(appAudits || []);
        
        // Auto pre-fill active requires-action stage
        if (app.requiresActionField) {
          setField(app.requiresActionField);
          setMessage(app.reason || '');
          setStage(String(app.currentStage));
        } else {
          setStage(String(app.currentStage));
        }
      })
      .catch((err: Error) => setError(err.message));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(actionFn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await actionFn();
      setReason('');
      setMessage('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  if (!row) {
    return (
      <div className="space-y-4">
        <ErrorBanner error={error} />
        <div className="flex h-40 items-center justify-center text-sm font-semibold text-slate-500">
          <span className="h-5 w-5 border-2 border-ore-600 border-t-transparent rounded-full animate-spin mr-2"></span>
          Loading applicant file...
        </div>
      </div>
    );
  }

  const isRider = row.kind === 'RIDER';
  const stage1Data = row.stageData?.stage1 || {};
  const stage2Data = row.stageData?.stage2 || {};
  const stage3Data = row.stageData?.stage3 || {};
  const stage4Data = row.stageData?.stage4 || {};
  const stage5Data = row.stageData?.stage5 || {};

  // Formulate stages based on kind
  const steps = isRider
    ? [
        { label: 'Profile File', desc: 'Personal details' },
        { label: 'SmileID verification', desc: 'Identity verification' },
        { label: 'Vehicle registration', desc: 'Driver credentials' },
        { label: 'Payment accounts', desc: 'Payout configuration' },
      ]
    : [
        { label: 'Merchant bio', desc: 'Owner profile' },
        { label: 'Store details', desc: 'Brand & category' },
        { label: 'Geofencing', desc: 'GPS geolocation' },
        { label: 'Legal & smile', desc: 'Legal documents' },
        { label: 'Payment & sla', desc: 'SLA contracts' },
      ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={row.businessName || row.applicantName || 'Unnamed Application'}
        subtitle={`Vetting portal for ${row.kind.toLowerCase()} file #${row.id}`}
        actions={
          <button
            onClick={() => router.push('/onboarding')}
            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Back to Queue
          </button>
        }
      />

      <ErrorBanner error={error} />

      {/* Basic tags overview */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
        <Pill tone={statusTone(row.status)}>{row.status}</Pill>
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold border uppercase tracking-wider ${
          isRider ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
        }`}>
          {row.kind}
        </span>
        <Pill tone={row.smileIdStatus === 'APPROVED' ? 'green' : 'amber'}>SmileID: {row.smileIdStatus}</Pill>
        {row.publicId && <Pill tone="blue">Issued ID: {row.publicId}</Pill>}
        {row.vendorType && <Pill>Category: {row.vendorType}</Pill>}
        {row.vehicle && <Pill>Vehicle: {row.vehicle}</Pill>}
      </div>

      {/* Progressive Stage Stepper */}
      <Card className="p-6 bg-white shadow-sm border border-slate-200">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Application Progress Stage Gate</h2>
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-5">
          {steps.map((st, index) => {
            const currentIdx = index + 1;
            const isCompleted = currentIdx < row.currentStage;
            const isActive = currentIdx === row.currentStage;
            const isStuck = isActive && row.status === 'REQUIRES_ACTION';
            
            return (
              <div
                key={st.label}
                className={`relative flex flex-col rounded-xl border p-4 transition-all duration-300 ${
                  isStuck
                    ? 'border-red-200 bg-red-50/30'
                    : isCompleted
                    ? 'border-emerald-100 bg-emerald-50/20'
                    : isActive
                    ? 'border-ore-300 bg-ore-50/10 shadow-sm ring-1 ring-ore-300'
                    : 'border-slate-100 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    isStuck ? 'text-red-600' : isCompleted ? 'text-emerald-700' : isActive ? 'text-ore-700' : 'text-slate-400'
                  }`}>
                    Stage {currentIdx}
                  </span>
                  {isCompleted && (
                    <span className="h-4 w-4 bg-emerald-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold">✓</span>
                  )}
                  {isStuck && (
                    <span className="h-4 w-4 bg-red-600 rounded-full flex items-center justify-center text-white text-[9px] font-bold">!</span>
                  )}
                </div>
                <div className="text-sm font-bold text-slate-800 line-clamp-1">{st.label}</div>
                <div className="text-xs text-slate-400 font-medium mt-0.5">{st.desc}</div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Dynamic Columns Vetting file */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Vetting profile data */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <Card className="p-6 bg-white shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-5 w-5 text-slate-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              Primary Personal File
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Applicant Name</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{row.applicantName || 'Unspecified'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Applicant Phone</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{row.applicantPhone}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Application Submitted</span>
                <span className="font-semibold text-slate-800 text-sm mt-0.5 block">{when(row.createdAt)}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Application ID</span>
                <span className="font-mono text-slate-600 text-xs mt-0.5 block">{row.id}</span>
              </div>
              {row.reason && row.status === 'REJECTED' && (
                <div className="sm:col-span-2 rounded-lg bg-red-50 border border-red-200 p-3.5 text-xs text-red-800">
                  <strong className="block mb-0.5 uppercase tracking-wide">Last Vetting Rejection Reason:</strong>
                  {row.reason}
                </div>
              )}
              {row.requiresActionField && row.status === 'REQUIRES_ACTION' && (
                <div className="sm:col-span-2 rounded-lg bg-blue-50 border border-blue-200 p-3.5 text-xs text-blue-800">
                  <strong className="block mb-0.5 uppercase tracking-wide">Action Required from User on Field [{row.requiresActionField}]:</strong>
                  {row.reason}
                </div>
              )}
            </div>
          </Card>

          {/* SmileID Verification Card */}
          <Card className="p-6 bg-white shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-5 w-5 text-ore-600">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
                SmileID Biometric KYC Verification
              </span>
              <Pill tone={row.smileIdStatus === 'APPROVED' ? 'green' : 'amber'}>{row.smileIdStatus}</Pill>
            </h2>
            {stage2Data && Object.keys(stage2Data).length > 0 ? (
              <div className="space-y-4 text-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase">Verification ID Type</span>
                    <span className="font-semibold text-slate-800">{stage2Data.idType || 'GHANA_CARD'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase">Verification ID Number</span>
                    <span className="font-semibold text-slate-800 font-mono">{stage2Data.idNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase">Biometric Match Result</span>
                    <span className={`font-semibold ${stage2Data.verified ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {stage2Data.verified ? 'Matched Successfully' : 'Unmatched / Pending Vetting'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-slate-400 uppercase">SmileID Job ID</span>
                    <span className="font-mono text-slate-500 text-xs">{stage2Data.jobId || '—'}</span>
                  </div>
                </div>
                {stage2Data.pii && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Decrypted PII Registry Details</span>
                    <div className="grid gap-2 sm:grid-cols-2 text-xs text-slate-600">
                      <div><strong className="text-slate-800 font-semibold">First Name:</strong> {stage2Data.pii.first_name || '—'}</div>
                      <div><strong className="text-slate-800 font-semibold">Surname:</strong> {stage2Data.pii.surname || '—'}</div>
                      <div><strong className="text-slate-800 font-semibold">Gender:</strong> {stage2Data.pii.gender || '—'}</div>
                      <div><strong className="text-slate-800 font-semibold">Date of Birth:</strong> {stage2Data.pii.dob || '—'}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
                Biometric KYC has not been triggered or evaluated for this draft application.
              </div>
            )}
          </Card>

          {/* Document & Credentials Vetting Card */}
          <Card className="p-6 bg-white shadow-sm border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-5 w-5 text-slate-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Required Document Files & Credentials
            </h2>
            {docs.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {docs.map((d) => (
                  <div key={d.id} className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-ore-300 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="h-2 w-2 rounded-full bg-ore-500"></span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{d.kind.replace('_', ' ')}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-800 line-clamp-1 truncate">{d.fileName}</div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">{d.contentType} · uploaded {when(d.createdAt)}</div>
                    </div>
                    
                    <a
                      href={`/gw/media/documents/${d.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-3.5 w-3.5 text-slate-500">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Preview & Download
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-xs text-slate-400">
                No formal uploaded media documents associated with this application records yet.
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Compliance Vetting Console Actions */}
        <div className="space-y-6">
          {/* Decisions Card */}
          <Card className="p-6 bg-slate-900 text-white shadow-xl border border-slate-800 relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 opacity-5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="h-40 w-40">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>

            <h2 className="text-base font-bold border-b border-white/10 pb-3 mb-4 flex items-center gap-2 text-white">
              Compliance Decision Console
            </h2>

            <div className="space-y-4">
              {/* Approve Action */}
              <div>
                <span className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Approve File</span>
                <button
                  disabled={busy || row.status === 'APPROVED'}
                  onClick={() => runAction(() => post(`onboarding/admin/applications/${id}/approve`))}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow hover:bg-emerald-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-4.5 w-4.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Approve & Issue Platform ID
                </button>
                {row.smileIdStatus !== 'APPROVED' && (
                  <span className="block text-[10px] text-amber-300 font-semibold mt-1">* Requires SmileID biometrics approval first</span>
                )}
              </div>

              {/* Reject Action */}
              <div className="border-t border-white/10 pt-4">
                <span className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Reject Application</span>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-white/50 font-bold uppercase mb-1">Rejection Reason</label>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Input the official rejection message..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-ore-500 focus:outline-none focus:ring-1 focus:ring-ore-500 outline-none"
                    />
                  </div>
                  <button
                    disabled={busy || !reason.trim() || row.status === 'APPROVED'}
                    onClick={() => runAction(() => post(`onboarding/admin/applications/${id}/reject`, { reason }))}
                    className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50 transition-all"
                  >
                    Reject Application File
                  </button>
                </div>
              </div>

              {/* Requires Action (Request Changes) */}
              <div className="border-t border-white/10 pt-4">
                <span className="block text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Request Re-upload / Correction</span>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-white/50 font-bold uppercase mb-1">Correction Field</label>
                    <input
                      value={field}
                      onChange={(e) => setField(e.target.value)}
                      placeholder="e.g. driversLicenseKey, nationalID"
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-ore-500 focus:outline-none focus:ring-1 focus:ring-ore-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/50 font-bold uppercase mb-1">Lock Back to Stage</label>
                    <select
                      value={stage}
                      onChange={(e) => setStage(e.target.value)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white outline-none cursor-pointer"
                    >
                      {Array.from({ length: row.maxStages }).map((_, i) => (
                        <option key={i} value={i + 1}>Stage {i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-white/50 font-bold uppercase mb-1">Instructions for User</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      placeholder="Input the exact SMS instructions asking them to correct it..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-ore-500 focus:outline-none focus:ring-1 focus:ring-ore-500 outline-none"
                    />
                  </div>
                  <button
                    disabled={busy || !field.trim() || !message.trim() || row.status === 'APPROVED'}
                    onClick={() =>
                      runAction(() =>
                        post(`onboarding/admin/applications/${id}/requires-action`, {
                          field,
                          message,
                          stage: Number(stage),
                        }),
                      )
                    }
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50 transition-all"
                  >
                    Lock File & Notify SMS
                  </button>
                </div>
              </div>
            </div>
          </Card>

          {/* Raw Stage Data Card */}
          <Card className="p-6 bg-white shadow-sm border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2.5 mb-3 flex items-center justify-between">
              <span>Full Raw Application State</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase">JSON Log</span>
            </h2>
            <div className="relative">
              <pre className="max-h-72 overflow-auto text-[10px] font-mono text-slate-500 bg-slate-50 border border-slate-100 p-3 rounded-lg leading-relaxed">
                {JSON.stringify(row.stageData, null, 2)}
              </pre>
            </div>
          </Card>
        </div>
      </div>

      {/* Audit Logs Compliance Timeline (Row below) */}
      <Card className="p-6 bg-white shadow-sm border border-slate-200">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-6 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-5 w-5 text-slate-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Compliance Audit Log Trail
        </h2>

        {audits.length > 0 ? (
          <div className="relative border-l border-slate-200 ml-4 pl-6 space-y-6">
            {audits.map((a) => {
              const isActionApprove = a.action === 'APPROVED';
              const isActionReject = a.action === 'REJECTED';
              const isActionReqAction = a.action === 'REQUIRES_ACTION';
              
              const iconColor = isActionApprove
                ? 'bg-emerald-100 text-emerald-700'
                : isActionReject
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700';
              
              return (
                <div key={a.id} className="relative group">
                  {/* Timeline dot */}
                  <span className={`absolute -left-[35px] top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full ring-4 ring-white ${iconColor}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 uppercase">Reviewer: {a.reviewerRole.replace('_', ' ')}</span>
                        <span className="text-[10px] text-slate-400 font-semibold font-mono">#{a.reviewerId.slice(0, 8)}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400">{when(a.createdAt)}</span>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        isActionApprove ? 'bg-emerald-50 text-emerald-700' : isActionReject ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {a.action}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Transitioned from <strong>{a.previousState}</strong> to <strong>{a.newState}</strong>
                      </span>
                    </div>

                    {a.reason && (
                      <p className="mt-2 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-100 p-2.5 rounded-lg max-w-2xl">
                        {a.reason}
                      </p>
                    )}

                    {a.requiresActionField && (
                      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
                        <span>Locked back on field:</span>
                        <span className="rounded bg-slate-100 border border-slate-200 px-1 font-mono text-slate-700">{a.requiresActionField}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-400">
            No compliance review logs have been recorded for this application file.
          </div>
        )}
      </Card>
    </div>
  );
}
