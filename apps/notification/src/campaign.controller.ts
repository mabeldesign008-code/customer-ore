import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { AuthGuard, CurrentUser, RequirePermission } from '@ore/core';
import { JwtPayload } from '@ore/core';

@Controller('notifications/campaigns')
@UseGuards(AuthGuard)
export class CampaignController {
  constructor(private readonly campaigns: CampaignService) {}

  @Post()
  @RequirePermission('marketing.campaign.create')
  create(@CurrentUser() user: JwtPayload, @Body() body: any) {
    return this.campaigns.create(user, body);
  }

  @Get()
  @RequirePermission('marketing.campaign.read')
  list() {
    return this.campaigns.list();
  }

  @Get(':id')
  @RequirePermission('marketing.campaign.read')
  getOne(@Param('id') id: string) {
    return this.campaigns.getOne(id);
  }

  @Put(':id')
  @RequirePermission('marketing.campaign.create')
  update(@Param('id') id: string, @Body() body: any) {
    return this.campaigns.update(id, body);
  }

  @Post(':id/request-approval')
  @RequirePermission('marketing.campaign.create')
  requestApproval(@Param('id') id: string) {
    return this.campaigns.requestApproval(id);
  }

  @Post(':id/approve')
  @RequirePermission('marketing.campaign.approve')
  approve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.campaigns.approve(id, user);
  }

  @Post(':id/schedule')
  @RequirePermission('marketing.campaign.send')
  schedule(@Param('id') id: string, @Body('scheduledAt') scheduledAt: string) {
    return this.campaigns.schedule(id, new Date(scheduledAt));
  }

  @Post(':id/send')
  @RequirePermission('marketing.campaign.send')
  sendNow(@Param('id') id: string) {
    return this.campaigns.sendNow(id);
  }
}
