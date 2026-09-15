import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TrackingService } from './tracking.service';
import { AuthGuard, CurrentUser, Internal, Public, Roles } from '@ore/core';
import { JwtPayload } from '@ore/core';
import { Role, locationUpdateSchema } from '@ore/contracts';
import { z } from 'zod';

const geocodeSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('google'), query: z.string().min(1) }),
  z.object({ mode: z.literal('w3w'), words: z.string().regex(/^(?:\/\/\/)?[a-zA-ZÀ-ÿ.-]+\.[a-zA-ZÀ-ÿ.-]+\.[a-zA-ZÀ-ÿ.-]+$/, 'Invalid what3words address') }),
  z.object({ mode: z.literal('ghanagps'), digitalAddress: z.string().min(1).max(40) }),
]);

const autocompleteSchema = z.object({
  input: z.string().min(1),
  sessionToken: z.string().optional(),
});

const placeDetailsSchema = z.object({
  placeId: z.string().min(1),
  sessionToken: z.string().optional(),
});

// These are @Public proxies in front of the server's GOOGLE_MAPS_API_KEY. An
// unauthenticated client could otherwise burn the paid quota at will (audit F-SEC-10),
// so each carries an explicit, tight per-IP budget on top of the global default.
const MAPS_THROTTLE = { default: { limit: 20, ttl: 60000 } };

@Controller('tracking')
@UseGuards(AuthGuard)
export class TrackingController {
  constructor(private readonly tracking: TrackingService) {}

  @Post('rider/location')
  @Roles(Role.RIDER)
  location(@CurrentUser() user: JwtPayload, @Body() body: unknown) {
    const dto = locationUpdateSchema.parse(body);
    return this.tracking.ingest(user.sub, dto.lat, dto.lng, dto.speedKmh, dto.orderId);
  }

  @Get('orders/:orderId/rider')
  @Roles(Role.CUSTOMER, Role.VENDOR, Role.RIDER, Role.ADMIN)
  rider(@CurrentUser() user: JwtPayload, @Param('orderId') orderId: string) {
    return this.tracking.riderPosition(orderId, user);
  }

  /** Internal: rider position for a proven order (support AI). Never exposed via the gateway. */
  @Get('internal/orders/:orderId/rider')
  @Internal()
  riderInternal(@Param('orderId') orderId: string) {
    return this.tracking.riderPositionInternal(orderId);
  }

  /** Public geocode endpoint — no auth required. Used by Flutter for address lookup. */
  @Post('geocode')
  @Public()
  @Throttle(MAPS_THROTTLE)
  geocode(@Body() body: unknown) {
    const dto = geocodeSchema.parse(body);
    return this.tracking.geocode(dto);
  }

  /** Google Places autocomplete suggestions — no auth, backend-proxied to protect API key. */
  @Post('places/autocomplete')
  @Public()
  @Throttle(MAPS_THROTTLE)
  async placesAutocomplete(@Body() body: unknown) {
    const dto = autocompleteSchema.parse(body);
    return this.tracking.placesAutocomplete(dto.input, dto.sessionToken);
  }

  /** Resolve a Google Place ID to lat/lng — no auth required. */
  @Post('places/details')
  @Public()
  @Throttle(MAPS_THROTTLE)
  async placeDetails(@Body() body: unknown) {
    const dto = placeDetailsSchema.parse(body);
    return this.tracking.placeDetails(dto.placeId, dto.sessionToken);
  }
}

