import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, DeviceToken } from './entities';
import { NotifyClient, createNotifyClient } from '@ore/notify';
import { JwtPayload } from '@ore/core';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);
  private notify: NotifyClient;

  constructor(
    @InjectRepository(Campaign) private campaigns: Repository<Campaign>,
    @InjectRepository(DeviceToken) private deviceTokens: Repository<DeviceToken>,
  ) {
    this.notify = createNotifyClient();
  }

  async init() {
    // A production system would mount a CRON job or Agenda to check for SCHEDULED campaigns.
    // We simulate a basic check here for architecture completeness.
    setInterval(() => this.processScheduledCampaigns(), 60000);
  }

  async create(user: JwtPayload, data: Partial<Campaign>) {
    const campaign = this.campaigns.create({
      ...data,
      createdByUserId: user.sub,
      status: 'DRAFT',
    });
    return this.campaigns.save(campaign);
  }

  async list() {
    return this.campaigns.find({ order: { createdAt: 'DESC' } });
  }

  async getOne(id: string) {
    const c = await this.campaigns.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Campaign not found');
    return c;
  }

  async update(id: string, data: Partial<Campaign>) {
    const c = await this.getOne(id);
    Object.assign(c, data);
    return this.campaigns.save(c);
  }

  async requestApproval(id: string) {
    const c = await this.getOne(id);
    c.status = 'PENDING_APPROVAL';
    return this.campaigns.save(c);
  }

  async approve(id: string, user: JwtPayload) {
    const c = await this.getOne(id);
    c.status = 'APPROVED';
    c.approvedByUserId = user.sub;
    return this.campaigns.save(c);
  }

  async schedule(id: string, scheduledAt: Date) {
    const c = await this.getOne(id);
    c.status = 'SCHEDULED';
    c.scheduledAt = scheduledAt;
    return this.campaigns.save(c);
  }

  async sendNow(id: string) {
    const c = await this.getOne(id);
    if (c.status !== 'APPROVED') throw new Error('Campaign must be approved before sending');
    c.status = 'SENDING';
    await this.campaigns.save(c);
    
    // Non-blocking execute
    this.executeCampaign(c.id).catch(e => this.logger.error(`Campaign execution failed`, e));
    return c;
  }

  private async processScheduledCampaigns() {
    const pending = await this.campaigns.find({
      where: { status: 'SCHEDULED' }
    });
    const now = new Date();
    for (const c of pending) {
      if (c.scheduledAt && c.scheduledAt <= now) {
        c.status = 'SENDING';
        await this.campaigns.save(c);
        this.executeCampaign(c.id).catch(e => this.logger.error(`Scheduled campaign execution failed`, e));
      }
    }
  }

  // Cross-service resolution of target audience
  private async resolveAudience(rule: Record<string, any>): Promise<string[]> {
    // In a full implementation, this hits the `auth` service or a data warehouse 
    // to retrieve the active user IDs matching the rule (e.g., segment="inactive_14_days").
    // For this demonstration, we query the `DeviceToken` table to find push-enabled users.
    const tokens = await this.deviceTokens.find({ select: ['userId'] });
    return [...new Set(tokens.map(t => t.userId))];
  }

  private async executeCampaign(id: string) {
    const campaign = await this.getOne(id);
    const audience = await this.resolveAudience(campaign.audienceRule);
    
    campaign.targetCount = audience.length;
    await this.campaigns.save(campaign);

    let sent = 0;
    let failed = 0;

    // Batch process to respect FCM Limits
    const BATCH_SIZE = 500;
    for (let i = 0; i < audience.length; i += BATCH_SIZE) {
      const batch = audience.slice(i, i + BATCH_SIZE);
      const pushMessages = [];

      for (const userId of batch) {
        const tokens = await this.deviceTokens.find({ where: { userId } });
        for (const device of tokens) {
          pushMessages.push({
            userId,
            deviceToken: device.token,
            // Simple personalization template replace
            title: campaign.titleTemplate.replace('{{first_name}}', 'Customer'), 
            body: campaign.bodyTemplate.replace('{{first_name}}', 'Customer'),
            data: (campaign.dataJson || {}) as any
          });
        }
      }

      if (pushMessages.length > 0) {
        if (this.notify.sendPushBatch) {
          const outcomes = await this.notify.sendPushBatch(pushMessages);
          sent += outcomes.filter(o => o.ok).length;
          failed += outcomes.filter(o => !o.ok).length;
          
          for (const outcome of outcomes) {
            if (!outcome.ok && outcome.error?.includes('FCM_TOKEN_INVALID')) {
               const msg = pushMessages.find(m => m.userId === outcome.userId);
               if (msg?.deviceToken) {
                 await this.deviceTokens.delete({ token: msg.deviceToken });
                 this.logger.warn(`Cleaned up invalid FCM token for user ${outcome.userId} during campaign`);
               }
            }
          }
        } else {
          // Fallback
          for (const msg of pushMessages) {
            try {
              await this.notify.sendPush(msg);
              sent++;
            } catch (err) {
              failed++;
              if (err instanceof Error && err.message.includes('FCM_TOKEN_INVALID') && msg.deviceToken) {
                await this.deviceTokens.delete({ token: msg.deviceToken });
                this.logger.warn(`Cleaned up invalid FCM token for user ${msg.userId} during campaign`);
              }
            }
          }
        }
      }
    }

    campaign.sentCount = sent;
    campaign.failCount = failed;
    campaign.status = 'COMPLETED';
    await this.campaigns.save(campaign);
  }
}
