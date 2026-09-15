/**
 * Edge trust boundary helpers.
 *
 * These live outside main.ts because main.ts calls bootstrap() at module scope — importing
 * it from a test would start a real server. Keeping the decision functions here makes the
 * two rules that define the public/internal boundary directly testable.
 */

/**
 * Trust headers that only ever travel service-to-service. A client has no legitimate
 * reason to send any of these, and the gateway is the trust boundary, so they are
 * stripped from every inbound request before it is proxied (audit F-SEC-22).
 *
 * Before this, @fastify/http-proxy forwarded them verbatim: a caller who possessed the
 * shared internal key could present it at the public edge and be authenticated as a
 * peer service by AuthGuard. The edge is the only place that can distinguish "came from
 * the internet" from "came from another pod", so it is the only place this can be fixed.
 */
export const INTERNAL_TRUST_HEADERS = [
  'x-ore-internal-key',
  'x-ore-internal-mac',
  'x-ore-internal-ts',
  'x-ore-service',
] as const;

/**
 * True when the request path addresses an `internal` route segment.
 *
 * This used to be `path.includes('/internal')` against the raw URL, which was bypassable
 * by percent-encoding a single character (audit F-SEC-21): `/api/auth/%69nternal/...`
 * contains no literal `/internal`, so the edge waved it through, and the downstream
 * Fastify router then decoded it and matched the internal handler. The 404 was decorative.
 *
 * Two changes. First, decode before matching — repeatedly, because a single pass turns
 * `%2569nternal` into `%69nternal`, which is still an attack. A malformed escape is
 * treated as hostile rather than ignored. Second, match on a path *segment* rather than
 * a substring: `/internal` as a substring also blocks legitimate resources that merely
 * start with the word (a pharmacy category `internal-medicine`, a vendor slug
 * `internal-affairs`), which segment matching allows through correctly.
 */
export function isInternalPath(rawPath: string): boolean {
  let p = rawPath;
  for (let i = 0; i < 3; i++) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(p);
    } catch {
      // Malformed percent-encoding. We cannot know what the downstream router will make
      // of it, so we refuse rather than guess.
      return true;
    }
    if (decoded === p) break;
    p = decoded;
  }
  // Backslashes are path separators to some routers and normalisers; fold them in.
  return p
    .replace(/\\/g, '/')
    .toLowerCase()
    .split('/')
    .includes('internal');
}

/**
 * The read-heavy catalog GETs the edge is allowed to serve from cache.
 *
 * Shared by the cache read hook and the cache write hook so the two can never disagree
 * about what is cacheable — they were duplicated string lists before, one keyed on the
 * path and one on the full URL including the query string.
 */
export function isCacheablePath(method: string, url: string): boolean {
  if (method !== 'GET') return false;
  const path = (url ?? '').split('?')[0];
  return (
    path.startsWith('/api/catalog/vendors') ||
    path.startsWith('/api/catalog/search') ||
    path.startsWith('/api/catalog/items')
  );
}

/**
 * Largest proxied response the edge will buffer in order to cache it (256 KB).
 *
 * The write hook has to read the upstream stream to completion before it can store the
 * body, so an unbounded cache would let one large response pin an arbitrary amount of
 * gateway memory. Catalog pages are a few KB; anything past this is streamed through
 * uncached rather than buffered.
 */
export const MAX_CACHEABLE_BYTES = 256 * 1024;

/**
 * Paths that carry base64-encoded media (KYC selfies, errand receipts, delivery proof
 * photos, catalog media). These legitimately exceed the 1 MB edge cap, so the edge
 * budget for them is raised to 50 MB (audit F-BUG-7). Everything else stays at 1 MB.
 */
export function isMediaUploadPath(path: string): boolean {
  // Prevent JSON DoS by matching exact upload endpoints strictly
  return (
    path.match(/^\/api\/catalog\/(vendors|items)\/[^\/]+\/(stories\/)?media(\/logo)?$/) !== null ||
    path.match(/^\/api\/onboarding\/(upload|smile\/document)$/) !== null ||
    path.match(/^\/api\/order\/orders\/[^\/]+\/(prescription(\/approve|\/reject)?|laundry-condition\/photos|errand\/receipt|delivery-(proof|signature))$/) !== null
  );
}
