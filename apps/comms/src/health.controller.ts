import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { Public } from '@ore/core';
import { DataSource } from 'typeorm';

@Controller('health')
@Public()
export class HealthController {
  constructor(
    @Optional() @Inject(DataSource) private readonly ds: DataSource | null,
  ) {}

  @Get()
  health() {
    return { status: 'ok', service: 'comms', ts: new Date().toISOString() };
  }

  @Get('ready')
  async ready() {
    const checks: Record<string, boolean> = {};

    if (this.ds) {
      try {
        await this.ds.query('SELECT 1');
        checks.db = true;
      } catch {
        checks.db = false;
      }
    }

    const ok = Object.values(checks).every(Boolean);
    const status = ok ? 'ok' : 'not_ready';
    return { status, service: 'comms', ts: new Date().toISOString(), checks };
  }
}
