import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { typeOrmForRoot } from '@ore/db';
import { OreCoreModule, AuthGuard, PermissionGuard, AllExceptionsFilter } from '@ore/core';
import { BaselineComms1750000000000 } from './migrations/1750000000000-BaselineComms';
import { Baseline1787380602000 } from './migrations/1787380602000-Baseline';
import { AddSupportAi1787800000000 } from './migrations/1787800000000-AddSupportAi';
import { SupportAiService } from './ai/support-ai.service';
import { SupportAdminService } from './support-admin.service';
import { SlaService } from './support-sla';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { SupportAdminController } from './support-admin.controller';
import { AddSupportTickets1788400000000 } from './migrations/1788400000000-AddSupportTickets';
import { SupportParticipant } from './entities';
import { AddSupportSwarming1787900000000 } from './migrations/1787900000000-AddSupportSwarming';
import { SupportToolRegistry } from './ai/support-tool.registry';
import { SupportToolService } from './ai/support-tools.service';
import { SupportEscalation, SupportToolAudit } from './entities';
import { HealthController } from './health.controller';
import { CommsController } from './comms.controller';
import { VoiceController } from './voice.controller';
import { CommsService } from './comms.service';
import { VoiceService } from './voice.service';
import { CommsGateway } from './comms.gateway';
import { CommsAccessService } from './comms.access';
import { CommsMessage, CommsThread, ContentArticle, ContentRevision, ContentCategory, ContentMedia, ContentBanner, VoiceCall } from './entities';
import { ContentService } from './content.service';
import { ContentAdminController } from './content-admin.controller';
import { ContentPublicController } from './content-public.controller';
import { AddContent1788700000000 } from './migrations/1788700000000-AddContent';
import { AddVoiceCalls1789200000000 } from './migrations/1789200000000-AddVoiceCalls';

@Module({
  imports: [
    OreCoreModule.forRoot('comms'),
    typeOrmForRoot({ schema: 'comms', entities: [CommsThread, CommsMessage, SupportEscalation, SupportToolAudit, SupportParticipant, ContentArticle, ContentRevision, ContentCategory, ContentMedia, ContentBanner, VoiceCall], migrations: [BaselineComms1750000000000, Baseline1787380602000, AddSupportAi1787800000000, AddSupportSwarming1787900000000, AddSupportTickets1788400000000, AddContent1788700000000, AddVoiceCalls1789200000000] }),
    TypeOrmModule.forFeature([CommsThread, CommsMessage, SupportEscalation, SupportToolAudit, SupportParticipant, ContentArticle, ContentRevision, ContentCategory, ContentMedia, ContentBanner, VoiceCall]),
  ],
  controllers: [CommsController, VoiceController, SupportAdminController, HealthController, TelegramController, ContentAdminController, ContentPublicController],
  providers: [
    CommsAccessService,
    ContentService,
    SupportToolService,
    SupportToolRegistry,
    SupportAiService,
    SupportAdminService,
    SlaService,
    TelegramService,
    CommsService,
    VoiceService,
    CommsGateway,
    { provide: APP_GUARD, useClass: AuthGuard },
    // AuthGuard sets req.user, PermissionGuard decides allow/deny. Order matters.
    { provide: APP_GUARD, useClass: PermissionGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly gateway: CommsGateway,
    private readonly content: ContentService,
  ) {}
  async onModuleInit(): Promise<void> {
    this.gateway.init();
    // Seed the Help / Blog / Legal categories so the editor's navigation and the public
    // help centre are not empty on a fresh database.
    await this.content.ensureSeeded();
  }
}
