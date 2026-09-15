import { BadRequestException, Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard, CurrentUser, Roles } from '@ore/core';
import { JwtPayload } from '@ore/core';
import { Role, createCommsThreadSchema, postCommsMessageSchema } from '@ore/contracts';
import { CommsService } from './comms.service';

@Controller('comms')
@UseGuards(AuthGuard)
export class CommsController {
  constructor(private readonly comms: CommsService) {}

  @Get('threads')
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.RIDER, Role.ADMIN)
  listThreads(@CurrentUser() user: JwtPayload, @Query('kind') kind?: string) {
    if (kind !== 'support') {
      throw new BadRequestException('kind=support is required to list threads');
    }
    return this.comms.listSupportThreads(user);
  }

  @Post('threads')
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.RIDER, Role.ADMIN)
  openThread(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = createCommsThreadSchema.parse(body);
    return this.comms.openThread(user, dto);
  }

  @Get('threads/:id')
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.RIDER, Role.ADMIN)
  getThread(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.comms.getThread(user, id);
  }

  @Get('threads/:id/messages')
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.RIDER, Role.ADMIN)
  listMessages(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    const parsed = limit ? Number.parseInt(limit, 10) : undefined;
    return this.comms.listMessages(user, id, before, Number.isFinite(parsed) ? parsed : undefined);
  }

  @Post('threads/:id/messages')
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.RIDER, Role.ADMIN)
  postMessage(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() body: unknown) {
    const dto = postCommsMessageSchema.parse(body);
    return this.comms.postMessage(user, id, dto.body, dto.attachments);
  }
}
