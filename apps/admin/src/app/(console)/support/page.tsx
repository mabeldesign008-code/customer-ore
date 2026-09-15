'use client';

/**
 * The support console.
 *
 * Layout is deliberate: queue on the left, conversation on the right, and the ticket
 * facts (reference, priority, SLA clock, owner) always in view. A rep answering an angry
 * customer should never have to leave the screen to find out who owns the ticket or how
 * long it has been waiting.
 *
 * Ownership is shown but not silently changeable. Claiming is explicit, and only the
 * owner — or a super admin — can resolve or close. That is enforced server-side too; the
 * UI just refuses to offer a button that would 403.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { gw, post } from '../../../lib/api';
import { useAdmin } from '../../../lib/context';
import { Button, Card, ErrorBanner, Field, PageHeader, Pill, Table, fmtWhen, inputClass, statusTone } from '../../../components/ui';

interface QueueRow {
  threadId: string;
  status: string;
  ownerAdminUserId: string | null;
  assignedToUserId: string | null;
  escalationReason: string | null;
  escalationTeam: string | null;
  flaggedTeams: string[];
  participantCount: number;
  updatedAt: string;
  ticketRef?: string | null;
  priority?: string;
  slaDueAt?: string | null;
  slaBreached?: boolean;
}

interface MessageRow {
  id: string;
  body: string;
  senderRole: string;
  senderId?: string | null;
  visibility: 'customer' | 'internal';
  createdAt: string;
}

interface ThreadDetail {
  thread: QueueRow & {
    firstResponseAt?: string | null;
    resolvedAt?: string | null;
    closedAt?: string | null;
    reopenCount?: number;
    csatScore?: number | null;
    category?: string | null;
    tags?: string[];
    ownerUserId?: string | null;
  };
  context?: {
    order?: any;
    payment?: any;
    rider?: any;
    vendor?: any;
  };
  messages: MessageRow[];
  participants: { userId: string; adminRole: string; invitedBy: string | null; joinedAt: string; active: boolean }[];
  escalations: { reason: string; summary: string | null; team: string; actor: string; fromStatus: string; toStatus: string; createdAt: string }[];
  aiToolCalls: { tool: string; outcome: string | null; model: string | null; createdAt: string }[];
}

interface Macro {
  id: string;
  label: string;
  body: string;
}

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

function slaLabel(row: { slaDueAt?: string | null; firstResponseAt?: string | null; slaBreached?: boolean }): { text: string; tone: 'slate' | 'green' | 'amber' | 'red' } {
  if (row.firstResponseAt) return { text: 'answered', tone: 'green' };
  if (!row.slaDueAt) return { text: 'no clock', tone: 'slate' };
  const mins = Math.round((new Date(row.slaDueAt).getTime() - Date.now()) / 60000);
  if (mins < 0) return { text: `${Math.abs(mins)}m overdue`, tone: 'red' };
  if (mins <= 15) return { text: `${mins}m left`, tone: 'amber' };
  return { text: `${mins}m left`, tone: 'slate' };
}

export default function SupportPage() {
  const { can } = useAdmin();
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [detail, setDetail] = useState<ThreadDetail | null>(null);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const loadQueue = useCallback(async () => {
    try {
      const rows = await gw<QueueRow[]>('comms/admin/support/queue?limit=80');
      setQueue(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const loadDetail = useCallback(async (threadId: string) => {
    try {
      const d = await gw<ThreadDetail>(`comms/admin/support/threads/${threadId}`);
      setDetail(d);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    gw<{ macros: Macro[] }>('comms/admin/support/macros').then((m) => setMacros(m.macros || [])).catch(() => undefined);
    // The queue is live work: refresh often enough to feel current, rarely enough that we
    // are not hammering the service while someone types.
    const t = setInterval(loadQueue, 10000);
    return () => clearInterval(t);
  }, [loadQueue]);

  useEffect(() => {
    if (!selected) return;
    loadDetail(selected);
    const t = setInterval(() => loadDetail(selected), 5000);
    return () => clearInterval(t);
  }, [selected, loadDetail]);

  // Keep the newest message on screen without the rep having to scroll back down.
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [detail?.messages.length]);

  const thread = detail?.thread;

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return queue;
    return queue.filter(
      (r) =>
        (r.ticketRef || '').toLowerCase().includes(q) ||
        (r.escalationReason || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q),
    );
  }, [queue, filter]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await Promise.all([loadQueue(), selected ? loadDetail(selected) : Promise.resolve()]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const unanswered = queue.filter((r) => !r.ownerAdminUserId).length;
  const overdue = queue.filter((r) => r.slaBreached).length;

  return (
    <div>
      <PageHeader
        title="Support"
        subtitle="Every conversation is a ticket. The rep who claims it owns it through to resolution."
        actions={
          <div className="flex items-center gap-2">
            <Pill tone={unanswered ? 'amber' : 'green'}>{unanswered} unclaimed</Pill>
            <Pill tone={overdue ? 'red' : 'slate'}>{overdue} overdue</Pill>
          </div>
        }
      />
      <ErrorBanner error={error} />

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
        {/* ── queue ── */}
        <Card className="flex flex-col">
          <div className="mb-2 flex items-center gap-2">
            <input
              className={inputClass}
              placeholder="Filter by ticket, reason or status"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <Button small onClick={loadQueue}>Refresh</Button>
          </div>
          <div className="max-h-[70vh] overflow-auto">
            {visible.length === 0 && (
              <p className="p-4 text-sm text-slate-500">Nothing in your queue.</p>
            )}
            {visible.map((r) => {
              const sla = slaLabel(r);
              const active = r.threadId === selected;
              return (
                <button
                  key={r.threadId}
                  onClick={() => setSelected(r.threadId)}
                  className={`w-full border-b border-slate-100 px-3 py-2 text-left transition-colors ${
                    active ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-slate-500">{r.ticketRef || r.threadId.slice(0, 8)}</span>
                    <Pill tone={statusTone(r.status)}>{r.status.replace(/_/g, ' ')}</Pill>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-600">
                      {r.escalationReason ? `⚑ ${r.escalationReason}` : 'no escalation'}
                      {r.escalationTeam ? ` → ${r.escalationTeam}` : ''}
                    </span>
                    <Pill tone={sla.tone}>{sla.text}</Pill>
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate-400">
                    {r.ownerAdminUserId ? 'owned' : 'unclaimed'} · {r.participantCount} in thread · {fmtWhen(r.updatedAt)}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── conversation ── */}
        {!thread ? (
          <Card>
            <p className="p-6 text-sm text-slate-500">Pick a conversation to open it.</p>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold">{thread.ticketRef || thread.threadId.slice(0, 8)}</span>
                <Pill tone={statusTone(thread.status)}>{thread.status.replace(/_/g, ' ')}</Pill>
                {thread.priority && <Pill tone={thread.priority === 'urgent' ? 'red' : thread.priority === 'high' ? 'amber' : 'slate'}>{thread.priority}</Pill>}
                {thread.category && <Pill tone="blue">{thread.category}</Pill>}
                {(thread.tags || []).map((t) => (
                  <Pill key={t}>{t}</Pill>
                ))}
                {typeof thread.reopenCount === 'number' && thread.reopenCount > 0 && (
                  <Pill tone="red">reopened ×{thread.reopenCount}</Pill>
                )}
                {typeof thread.csatScore === 'number' && <Pill tone={thread.csatScore >= 4 ? 'green' : 'amber'}>CSAT {thread.csatScore}/5</Pill>}
                <span className="ml-auto text-xs text-slate-500">{slaLabel(thread).text}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {!thread.ownerAdminUserId && (
                  <Button small disabled={busy} onClick={() => act(() => gw(`comms/admin/support/threads/${thread.threadId}/claim`, { method: 'POST', body: '{}' }))}>
                    Claim
                  </Button>
                )}
                <select
                  className={inputClass}
                  value={thread.priority || 'normal'}
                  disabled={busy}
                  onChange={(e) =>
                    act(() => gw(`comms/admin/support/threads/${thread.threadId}/meta`, { method: 'POST', body: JSON.stringify({ priority: e.target.value }) }))
                  }
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <Button small disabled={busy} onClick={() => act(() => gw(`comms/admin/support/threads/${thread.threadId}/resolve`, { method: 'POST', body: '{}' }))}>
                  Resolve
                </Button>
                <Button small disabled={busy} onClick={() => act(() => gw(`comms/admin/support/threads/${thread.threadId}/close`, { method: 'POST', body: '{}' }))}>
                  Close
                </Button>
                {(thread.status === 'RESOLVED' || thread.status === 'CLOSED') && (
                  <Button small disabled={busy} onClick={() => act(() => gw(`comms/admin/support/threads/${thread.threadId}/reopen`, { method: 'POST', body: '{}' }))}>
                    Reopen
                  </Button>
                )}
                <Button small disabled={busy} onClick={() => act(() => gw(`comms/admin/support/threads/${thread.threadId}/return-to-ai`, { method: 'POST', body: '{}' }))}>
                  Hand back to AI
                </Button>
              </div>
            </Card>

            <Card>
              {detail?.context?.order && (
                <div className="mb-4 bg-slate-50 p-3 rounded-md text-sm">
                  <div className="font-semibold text-slate-800 mb-2">360° Context View: Order {detail.context.order.ref || detail.context.order.id}</div>
                  <div className="grid grid-cols-2 gap-2 text-slate-600 mb-3">
                    <div>
                      <strong>Customer ID:</strong> {detail.context.order.customerId}
                    </div>
                    <div>
                      <strong>Payment Status:</strong> {detail.context.payment?.status || 'Unknown'}
                    </div>
                    {detail.context.vendor && (
                      <div>
                        <strong>Vendor:</strong> {detail.context.vendor.name} ({detail.context.vendor.id})
                      </div>
                    )}
                    {detail.context.rider && (
                      <div>
                        <strong>Rider:</strong> {detail.context.rider.name} ({detail.context.rider.id})
                      </div>
                    )}
                    <div>
                      <strong>Order Status:</strong> {detail.context.order.status}
                    </div>
                  </div>
                  
                  {/* Actionable Support Controls.
                      Cancel goes through the ADMIN route (order.cancel permission) — the
                      customer route is Role.CUSTOMER-only since audit fix F-SEC-6.
                      Refund raises a maker-checker request (finance.refund.initiate), it
                      never moves money by itself. */}
                  <div className="flex gap-2 border-t border-slate-200 pt-3">
                    <Button small tone="ghost" onClick={() => window.open('/orders', '_blank')}>
                      View Orders
                    </Button>
                    {can('order.cancel') ? (
                      <Button small tone="danger" onClick={async () => {
                        const orderId = detail.context?.order?.id as string | undefined;
                        if (!orderId) return;
                        if (!window.confirm('Are you sure you want to cancel this order?')) return;
                        try {
                          await post(`order/admin/orders/${orderId}/cancel`, { reason: 'Cancelled by support agent' });
                          window.alert('Order cancelled');
                          void loadQueue();
                        } catch (err) { window.alert(`Failed to cancel order: ${(err as Error).message}`); }
                      }}>
                        Cancel Order
                      </Button>
                    ) : null}
                    {can('finance.refund.initiate') ? (
                      <Button small tone="ghost" onClick={async () => {
                        const order = detail.context?.order as { id?: string; totalPesewas?: number } | undefined;
                        if (!order?.id) return;
                        const raw = window.prompt('Enter refund amount in pesewas (leave blank for the full order total):');
                        if (raw === null) return;
                        const parsed = raw.trim() === '' ? order.totalPesewas : Number.parseInt(raw.trim(), 10);
                        if (!parsed || parsed <= 0 || !Number.isFinite(parsed)) {
                          window.alert('Enter a positive whole amount in pesewas.');
                          return;
                        }
                        try {
                          await post('payment/admin/refund-requests', {
                            orderId: order.id,
                            amountPesewas: parsed,
                            reason: 'Requested by support agent',
                          });
                          window.alert('Refund requested — it enters the approval queue.');
                        } catch (err) { window.alert(`Failed to request refund: ${(err as Error).message}`); }
                      }}>
                        Request Refund
                      </Button>
                    ) : null}
                  </div>
                </div>
              )}
              <div ref={listRef} className="max-h-[45vh] space-y-2 overflow-auto pr-1">
                {(detail?.messages || []).map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-md border px-3 py-2 text-sm ${
                      m.visibility === 'internal'
                        ? 'border-amber-200 bg-amber-50'
                        : m.senderRole === 'customer'
                          ? 'border-slate-200 bg-white'
                          : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="mb-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span className="font-semibold uppercase">{m.senderRole}</span>
                      {m.visibility === 'internal' && <Pill tone="amber">internal note — customer never sees this</Pill>}
                      <span className="ml-auto">{fmtWhen(m.createdAt)}</span>
                    </div>
                    <div className="whitespace-pre-wrap">{m.body}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3">
                {macros.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {macros.map((m) => (
                      <button
                        key={m.id}
                        className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-50"
                        title={m.body}
                        onClick={() => setDraft((d) => (d ? `${d}\n${m.body}` : m.body))}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
                <textarea
                  className={inputClass}
                  rows={3}
                  placeholder={internal ? 'Internal note — only other staff see this' : 'Reply to the customer…'}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="mt-2 flex items-center gap-3">
                  <label className="flex items-center gap-1 text-xs text-slate-600">
                    <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                    internal note
                  </label>
                  <Button
                    small
                    disabled={busy || !draft.trim()}
                    onClick={() =>
                      act(async () => {
                        await gw(`comms/admin/support/threads/${thread.threadId}/messages`, {
                          method: 'POST',
                          body: JSON.stringify({ body: draft.trim(), visibility: internal ? 'internal' : 'customer' }),
                        });
                        setDraft('');
                      })
                    }
                  >
                    {internal ? 'Add note' : 'Send reply'}
                  </Button>
                </div>
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <h3 className="mb-2 text-sm font-semibold">Participants</h3>
                <Table
                  columns={['Admin', 'Role', 'Invited by', 'Active']}
                  rows={(detail?.participants || []).map((p) => [
                    <span key={p.userId} className="font-mono text-xs">{p.userId.slice(0, 8)}</span>,
                    p.adminRole,
                    p.invitedBy ? <span className="font-mono text-xs">{p.invitedBy.slice(0, 8)}</span> : '—',
                    p.active ? <Pill tone="green">yes</Pill> : <Pill>left</Pill>,
                  ])}
                />
              </Card>

              <Card>
                <h3 className="mb-2 text-sm font-semibold">Why the AI said what it said</h3>
                {(!detail?.aiToolCalls || detail.aiToolCalls.length === 0) && (
                  <p className="text-xs text-slate-500">No tool calls on this thread.</p>
                )}
                <Table
                  columns={['Tool', 'Outcome', 'When']}
                  rows={(detail?.aiToolCalls || []).slice(-8).map((a) => [
                    a.tool,
                    a.outcome || '—',
                    fmtWhen(a.createdAt),
                  ])}
                />
              </Card>
            </div>

            {!!detail?.escalations?.length && (
              <Card>
                <h3 className="mb-2 text-sm font-semibold">Escalation history</h3>
                <Table
                  columns={['Reason', 'Team', 'From', 'To', 'Summary', 'When']}
                  rows={detail.escalations.map((e) => [
                    e.reason,
                    e.team,
                    e.fromStatus,
                    e.toStatus,
                    e.summary || '—',
                    fmtWhen(e.createdAt),
                  ])}
                />
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
