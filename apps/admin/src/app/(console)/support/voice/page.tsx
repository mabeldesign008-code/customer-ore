'use client';

/**
 * Agent voice console — the browser softphone for Ore Support.
 *
 * Go online and this tab becomes a ringable Twilio Voice client:
 *  - `POST comms/voice/agent-token` registers a Device (identity `ore_<adminUserId>`);
 *  - `POST comms/voice/presence` heartbeats every 25s (Redis TTL is 45s — stop beating
 *    and you stop ringing). `forwardPhone` is the agent mobile Twilio falls back to when
 *    no browser answers;
 *  - support calls sim-ring every online agent; first to accept wins, the rest get
 *    `cancel`;
 *  - no browser answers → Twilio forwards to agent mobiles → nobody → recorded voicemail
 *    (consent announcement is in the TwiML, recording URLs land on the CDR).
 *
 * Everything here is permission-gated server-side: `support.voice.answer` for the phone,
 * `support.voice.cdr.read` for the call history.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { gw } from '../../../../lib/api';
import { useAdmin } from '../../../../lib/context';
import { Button, Card, ErrorBanner, Field, PageHeader, Pill, Table, fmtWhen, inputClass, statusTone } from '../../../../components/ui';

type Session = {
  provider: 'log' | 'twilio';
  token?: string;
  identity?: string;
  expiresAt?: string;
  ttlSec?: number;
  support?: boolean;
};

type AgentRow = { userId: string; forwardPhone: string | null; at: number };

type CdrRow = {
  callId: string;
  kind: 'order' | 'support';
  orderId: string | null;
  callerUserId: string;
  targetUserId: string | null;
  target: string | null;
  provider: 'log' | 'twilio';
  platform: string | null;
  status: string;
  fallbackUsed: boolean;
  twilioCallSid: string | null;
  recordingUrl: string | null;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
};

const E164 = /^\+[1-9]\d{7,15}$/;
const HEARTBEAT_MS = 25_000; // backend presence TTL is 45s

function prettyFrom(call: Call): string {
  const name = call.customParameters.get('__TWI_CALLER_NAME');
  if (name) return name;
  const from = (call.parameters.From || '').replace(/^client:/i, '');
  return from || 'Ore customer';
}

export default function VoiceConsolePage() {
  const { can } = useAdmin();
  const canAnswer = can('support.voice.answer');
  const canReadCdr = can('support.voice.cdr.read');

  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [starting, setStarting] = useState(false);
  const [forwardPhone, setForwardPhone] = useState('');
  const [incoming, setIncoming] = useState<Call | null>(null);
  const [active, setActive] = useState<Call | null>(null);
  const [callerName, setCallerName] = useState('');
  const [muted, setMuted] = useState(false);
  const [degraded, setDegraded] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [cdr, setCdr] = useState<CdrRow[]>([]);

  const deviceRef = useRef<Device | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const forwardRef = useRef('');
  forwardRef.current = forwardPhone.trim();

  const beat = useCallback(async () => {
    const fwd = forwardRef.current;
    try {
      await gw('comms/voice/presence', {
        method: 'POST',
        body: JSON.stringify({ online: true, ...(E164.test(fwd) ? { forwardPhone: fwd } : {}) }),
      });
    } catch {
      // A missed beat is fine (TTL 45s); the next one lands.
    }
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const rows = await gw<AgentRow[]>('comms/voice/agents');
      setAgents(Array.isArray(rows) ? rows : []);
    } catch {
      setAgents([]);
    }
  }, []);

  const loadCdr = useCallback(async () => {
    if (!canReadCdr) return;
    try {
      const rows = await gw<CdrRow[]>('comms/voice/calls?limit=40');
      setCdr(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [canReadCdr]);

  const wireCall = useCallback((call: Call) => {
    const clearTimer = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
    call.on('accept', () => {
      setActive(call);
      setIncoming(null);
      setMuted(false);
      setDegraded(false);
      setSeconds(0);
      clearTimer();
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    });
    call.on('disconnect', () => {
      clearTimer();
      setActive(null);
      setDegraded(false);
      void loadCdr();
    });
    call.on('cancel', () => {
      // Another agent answered first (sim-ring) or the caller hung up.
      setIncoming(null);
    });
    call.on('reject', () => setIncoming(null));
    call.on('error', (err) => {
      clearTimer();
      setIncoming(null);
      setActive(null);
      setError(`Call error: ${err?.message ?? 'unknown'}`);
      void loadCdr();
    });
    call.on('reconnecting', () => setDegraded(true));
    call.on('reconnected', () => setDegraded(false));
    call.on('warning', (name: string) => {
      if (['high-rtt', 'high-jitter', 'high-packet-loss', 'low-mos'].includes(name)) setDegraded(true);
    });
    call.on('warning-cleared', () => setDegraded(false));
    call.on('mute', () => setMuted(true));
    call.on('unmute', () => setMuted(false));
  }, [loadCdr]);

  // Synchronous re-entrancy guard: `starting` state + disabled button covers clicks,
  // but there is an async gap before deviceRef is set — two overlapping goOnline calls
  // would otherwise register two Devices and leak one (ghost ringable registration).
  const startingRef = useRef(false);

  const goOnline = useCallback(async () => {
    if (startingRef.current || deviceRef.current) return;
    startingRef.current = true;
    setError(null);
    setStarting(true);
    try {
      const session = await gw<Session>('comms/voice/agent-token', {
        method: 'POST',
        body: JSON.stringify({ platform: 'web' }),
      });
      if (session.provider !== 'twilio' || !session.token) {
        throw new Error('Voice provider is not configured on the backend (VOICE_PROVIDER=log).');
      }
      const device = new Device(session.token, { codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU] });
      deviceRef.current = device;
      device.on('registered', () => {
        setOnline(true);
        void beat();
        heartbeatRef.current = setInterval(() => void beat(), HEARTBEAT_MS);
        void loadAgents();
      });
      device.on('unregistered', () => setOnline(false));
      device.on('error', (err: { message?: string }) => {
        setError(`Softphone error: ${err?.message ?? 'unknown'}`);
      });
      device.on('tokenWillExpire', async () => {
        // Tokens live 15 minutes; refresh without dropping the registration.
        try {
          const fresh = await gw<Session>('comms/voice/agent-token', {
            method: 'POST',
            body: JSON.stringify({ platform: 'web' }),
          });
          if (fresh.token) await device.updateToken(fresh.token);
        } catch {
          // Next tick tries again; the SDK keeps the old token until expiry.
        }
      });
      device.on('incoming', (call: Call) => {
        setIncoming(call);
        setCallerName(prettyFrom(call));
        wireCall(call);
      });
      await device.register();
    } catch (e) {
      setError((e as Error).message);
      deviceRef.current?.destroy();
      deviceRef.current = null;
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }, [beat, loadAgents, wireCall]);

  const goOffline = useCallback(async () => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    const device = deviceRef.current;
    deviceRef.current = null;
    setOnline(false);
    setIncoming(null);
    setActive(null);
    try {
      await gw('comms/voice/presence', { method: 'POST', body: JSON.stringify({ online: false }) });
    } catch {
      // TTL will expire us anyway.
    }
    device?.destroy();
  }, []);

  // Leaving the page takes the agent offline — a stale presence entry would keep
  // routing support calls to a dead tab.
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      const device = deviceRef.current;
      deviceRef.current = null;
      if (device) {
        gw('comms/voice/presence', { method: 'POST', body: JSON.stringify({ online: false }) }).catch(() => undefined);
        device.destroy();
      }
    };
  }, []);

  useEffect(() => {
    void loadCdr();
  }, [loadCdr]);

  useEffect(() => {
    if (!online) return;
    const id = setInterval(() => void loadAgents(), 30_000);
    return () => clearInterval(id);
  }, [online, loadAgents]);

  if (!canAnswer) {
    return (
      <div>
        <PageHeader title="Voice console" subtitle="Support softphone" />
        <Card className="p-6 text-sm text-slate-600">
          Your admin role does not hold <code className="rounded bg-slate-100 px-1">support.voice.answer</code>, so the
          softphone is not offered. Ask a super admin to grant it.
        </Card>
      </div>
    );
  }

  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div>
      <PageHeader
        title="Voice console"
        subtitle="Answer Ore Support calls in the browser. Callers fall back to agent mobiles, then recorded voicemail."
        actions={
          <div className="flex items-center gap-3">
            <Pill tone={online ? 'green' : 'slate'}>{online ? 'online — ringing' : 'offline'}</Pill>
            {online ? (
              <Button tone="danger" onClick={() => void goOffline()}>
                Go offline
              </Button>
            ) : (
              <Button disabled={starting} onClick={() => void goOnline()}>
                {starting ? 'Registering…' : 'Go online'}
              </Button>
            )}
          </div>
        }
      />
      <ErrorBanner error={error} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {incoming ? (
            <Card className="border-ore-100 bg-ore-50 p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-ore-700">Incoming support call</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{callerName}</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    tone="ghost"
                    onClick={() => {
                      incoming.reject();
                      setIncoming(null);
                    }}
                  >
                    Decline
                  </Button>
                  <Button onClick={() => incoming.accept()}>Answer</Button>
                </div>
              </div>
            </Card>
          ) : null}

          {active ? (
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">On a call</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{callerName}</p>
                  <p className="mt-1 font-mono text-sm text-slate-600">{mmss}</p>
                </div>
                <div className="flex items-center gap-3">
                  {degraded ? <Pill tone="amber">weak network</Pill> : null}
                  <Button tone="ghost" onClick={() => active.mute(!muted)}>
                    {muted ? 'Unmute' : 'Mute'}
                  </Button>
                  <Button tone="danger" onClick={() => active.disconnect()}>
                    Hang up
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}

          <Card className="p-6">
            <Field label="Forward phone (optional)">
              <input
                className={inputClass}
                value={forwardPhone}
                onChange={(e) => setForwardPhone(e.target.value)}
                placeholder="+233241234567 — rings you when no browser agent answers"
                inputMode="tel"
              />
            </Field>
            <p className="mt-2 text-xs text-slate-500">
              E.164 format. Sent with the presence heartbeat; Twilio dials it only when every online browser agent lets
              the call ring out. Calls may be recorded — the caller hears a consent announcement first.
            </p>
          </Card>

          {canReadCdr ? (
            <Card className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Recent calls</h2>
                <Button small tone="ghost" onClick={() => void loadCdr()}>
                  Refresh
                </Button>
              </div>
              <Table
                columns={['When', 'Kind', 'Caller → target', 'Status', 'Duration', 'Fallback', 'Recording']}
                rows={cdr.map((r) => [
                  <span key="t" className="whitespace-nowrap">{fmtWhen(r.startedAt)}</span>,
                  <Pill key="k" tone={r.kind === 'support' ? 'blue' : 'slate'}>{r.kind}</Pill>,
                  <span key="c" className="font-mono text-xs">
                    {r.callerUserId.slice(0, 10)} → {r.kind === 'support' ? 'agents' : (r.targetUserId ?? '').slice(0, 10) || r.target || '—'}
                  </span>,
                  <Pill key="s" tone={statusTone(r.status)}>{r.status}</Pill>,
                  <span key="d">{r.durationSec != null ? `${r.durationSec}s` : '—'}</span>,
                  <span key="f">{r.fallbackUsed ? 'yes' : '—'}</span>,
                  r.recordingUrl ? (
                    <a key="r" href={r.recordingUrl} target="_blank" rel="noreferrer" className="text-ore-700 underline">
                      play
                    </a>
                  ) : (
                    <span key="r">—</span>
                  ),
                ])}
              />
              {cdr.length === 0 ? <p className="mt-3 text-sm text-slate-500">No calls recorded yet.</p> : null}
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Agents online</h2>
              <Button small tone="ghost" onClick={() => void loadAgents()}>
                Refresh
              </Button>
            </div>
            {agents.length === 0 ? (
              <p className="text-sm text-slate-500">Nobody is online. Support calls will go straight to voicemail forwarding.</p>
            ) : (
              <ul className="space-y-2">
                {agents.map((a) => (
                  <li key={a.userId} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs text-slate-700">{a.userId.slice(0, 12)}</span>
                    <Pill tone={a.forwardPhone ? 'green' : 'slate'}>{a.forwardPhone ? 'mobile fwd' : 'browser only'}</Pill>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6 text-sm text-slate-600">
            <h2 className="mb-2 text-sm font-bold text-slate-900">How ringing works</h2>
            <ol className="list-decimal space-y-1 pl-4">
              <li>Every online browser agent rings at once; first to answer wins.</li>
              <li>No answer → each agent&apos;s forward phone rings (30s).</li>
              <li>Still nobody → the caller records a voicemail after a consent announcement.</li>
            </ol>
            <p className="mt-3 text-xs text-slate-500">
              Stay on this tab while online. Closing it takes you offline automatically.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
