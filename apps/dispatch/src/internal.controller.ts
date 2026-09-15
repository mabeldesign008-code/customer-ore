import { Body, Controller, Post } from '@nestjs/common';
import { Internal } from '@ore/core';
import { onboardRiderSchema } from '@ore/contracts';
import { DispatchService } from './dispatch.service';

/** Internal endpoints consumed by onboarding (approval → verified rider + backend-generated Rider ID). */
@Controller('internal')
@Internal()
export class InternalController {
  constructor(private readonly dispatch: DispatchService) {}

  @Post('riders/onboard')
  onboard(@Body() body: unknown) {
    return this.dispatch.onboardRider(onboardRiderSchema.parse(body));
  }
}
