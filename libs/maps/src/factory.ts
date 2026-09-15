/** Geocoder factory: mock (offline) or live (real keys). */

import { loadEnv } from '@ore/config';
import { Geocoder } from './geocoder';
import { LiveGeocoder } from './live';
import { MockGeocoder } from './mock';

export function createGeocoder(env: Record<string, string | undefined> = process.env): Geocoder {
  const ore = loadEnv(env);
  // An explicit mock mode must remain deterministic even when a developer's
  // local template contains a placeholder Google key. Live Google calls are
  // enabled deliberately with GEOCODER_MODE=live.
  const useLive = ore.geocoderMode === 'live';
  return useLive ? new LiveGeocoder(env) : new MockGeocoder();
}
