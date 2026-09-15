'use client';

/**
 * Marketing campaigns — draft → request approval → approve → send.
 *
 * Maker-checker is enforced server-side by distinct permissions
 * (marketing.campaign.create vs .approve vs .send); this page only reflects the
 * state machine. `gw` returns parsed JSON directly (no `.data` wrapper) and
 * throws ApiError on a backend rejection — errors surface, they are not swallowed.
 */

import { useCallback, useEffect, useState } from 'react';
import { gw, post } from '../../../../lib/api';
import { useAdmin } from '../../../../lib/context';
import { Button, Card, ErrorBanner, PageHeader, Pill, Table, fmtWhen } from '../../../../components/ui';

interface Campaign {
  id: string;
  name: string;
  titleTemplate?: string | null;
  bodyTemplate?: string | null;
  status: string;
  audienceRule?: unknown;
  targetCount?: number | null;
  sentCount?: number | null;
  failCount?: number | null;
  scheduledAt?: string | null;
  createdAt: string;
}

export default function CampaignsPage() {
  const { can } = useAdmin();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await gw<Campaign[]>('notifications/campaigns');
      setCampaigns(Array.isArray(rows) ? rows : []);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  async function createCampaign() {
    const name = window.prompt('Campaign Name:');
    if (!name) return;
    try {
      await post('notifications/campaigns', {
        name,
        titleTemplate: 'Hi {{first_name}}',
        bodyTemplate: 'We have a special offer for you!',
        audienceRule: { segment: 'all' },
      });
      await loadCampaigns();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function transition(id: string, action: 'send' | 'request-approval' | 'approve', confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await post(`notifications/campaigns/${id}/${action}`);
      await loadCampaigns();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Marketing Campaigns"
        subtitle="Draft → approval → send. The backend enforces who may do each step."
        actions={
          can('marketing.campaign.create') ? <Button onClick={() => void createCampaign()}>Create Campaign</Button> : undefined
        }
      />
      <ErrorBanner error={error} />

      <Card>
        {loading ? (
          <div className="p-4 text-slate-500">Loading…</div>
        ) : (
          <Table
            columns={['Name', 'Status', 'Audience', 'Sent / Failed', 'Created', 'Actions']}
            rows={campaigns.map((c) => [
              <span key="n">{c.name}</span>,
              <Pill key="s" tone={c.status === 'COMPLETED' ? 'green' : 'slate'}>
                {c.status}
              </Pill>,
              <span key="a" className="text-sm text-slate-500">
                {(c.targetCount ?? 0) > 0 ? `${c.targetCount} users` : 'Draft'}
              </span>,
              <span key="sf" className="text-sm">
                {c.sentCount ?? 0} / {c.failCount ?? 0}
              </span>,
              <span key="c" className="text-sm text-slate-500">
                {fmtWhen(c.createdAt)}
              </span>,
              <span key="act" className="flex gap-2">
                {c.status === 'APPROVED' && can('marketing.campaign.send') ? (
                  <Button
                    small
                    tone="ghost"
                    onClick={() => void transition(c.id, 'send', 'Send this campaign immediately?')}
                  >
                    Send Now
                  </Button>
                ) : null}
                {c.status === 'DRAFT' && can('marketing.campaign.create') ? (
                  <Button small tone="ghost" onClick={() => void transition(c.id, 'request-approval')}>
                    Request Approval
                  </Button>
                ) : null}
                {c.status === 'PENDING_APPROVAL' && can('marketing.campaign.approve') ? (
                  <Button small tone="primary" onClick={() => void transition(c.id, 'approve')}>
                    Approve
                  </Button>
                ) : null}
              </span>,
            ])}
          />
        )}
        {!loading && campaigns.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No campaigns yet.</div>
        ) : null}
      </Card>
    </div>
  );
}
