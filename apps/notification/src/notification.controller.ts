import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard, CurrentUser } from '@ore/core';
import { JwtPayload } from '@ore/core';
import { registerDeviceTokenSchema } from '@ore/contracts';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get('me')
  mine(@CurrentUser() user: JwtPayload) {
    return this.notifications.myFeed(user.sub);
  }

  @Post('device-token')
  registerDeviceToken(
    @CurrentUser() user: JwtPayload,
    @Body() body: unknown,
  ) {
    const dto = registerDeviceTokenSchema.parse(body);
    return this.notifications.registerDeviceToken(user.sub, dto.token, dto.platform);
  }

  @Post(':id/read')
  read(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.notifications.markRead(user.sub, id);
  }
}
