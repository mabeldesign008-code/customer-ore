/** Single source for service ports and origins. Do not copy this map into apps. */

export const SERVICE_PORTS: Record<string, number> = {
  gateway: 4000,
  auth: 4100,
  catalog: 4101,
  cart: 4102,
  order: 4103,
  payment: 4104,
  dispatch: 4105,
  tracking: 4106,
  notification: 4107,
  ledger: 4108,
  onboarding: 4109,
  referral: 4110,
  comms: 4111,
  analytics: 4112,
};

export const INTERNAL_KEY_HEADER = 'x-ore-internal-key';

export function serviceUrl(name: string, env: Record<string, string | undefined> = process.env): string {
  const explicit = env[`${name.toUpperCase()}_URL`]?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const port = SERVICE_PORTS[name];
  return port ? `http://127.0.0.1:${port}` : '';
}
