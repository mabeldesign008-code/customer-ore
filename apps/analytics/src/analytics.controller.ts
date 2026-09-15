import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Internal } from '@ore/core';

/** Internal read surface for the analytics facts (support AI, admin console, BI). */
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('internal/events')
  @Internal()
  events(
    @Query('name') name?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analytics.list(name, from ? new Date(from) : undefined, to ? new Date(to) : undefined, limit ? Number(limit) : undefined);
  }

  @Get('internal/summary')
  @Internal()
  summary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.summary(from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }
}
