/**
 * Cross-service URL contract: every `serviceUrl('x')` call must hit a route service `x` mounts.
 *
 * WHY THIS IS A TEST AND NOT A REVIEW
 * The unit tests for every caller stub `internalFetch`, so a wrong path is invisible to them.
 * The e2e scripts run all fourteen services in one process against sqlite, where the calls are
 * still real HTTP but nobody asserts a 404 didn't happen — a service that swallows the failure
 * into a friendly message looks like a validation rejection.
 *
 * Cart shipped `${serviceUrl('auth')}/internal/users/:id/standing` while auth mounts that route
 * at `/auth/internal/users/:id/standing` (the controller carries an `/auth` prefix). Every COD
 * checkout 404'd and the customer was told "Could not verify cash-on-delivery eligibility".
 * Cash on delivery was completely broken in any deployment where the services are separate
 * processes, which is every real one.
 *
 * The check is static — it reads the callers' template literals and the callees' controller
 * decorators — so it costs nothing and runs on every test pass.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = join(__dirname, '..', '..', '..');
const APPS_DIR = join(REPO_ROOT, 'apps');
const LIBS_DIR = join(REPO_ROOT, 'libs');

/** Apps that are not NestJS services and mount no routes. */
const NOT_A_SERVICE = new Set(['admin']);

function sourceFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (['node_modules', 'dist', '.next', 'migrations'].includes(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) out.push(full);
    }
  };
  for (const pkg of readdirSync(root)) {
    const src = join(root, pkg, 'src');
    try {
      if (statSync(src).isDirectory()) walk(src);
    } catch {
      /* package without src */
    }
  }
  return out;
}

/** Strip comments so documented examples are not mistaken for real call sites or routes. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** Every route a service mounts, as `METHOD /full/path`, read from its controller decorators. */
function mountedRoutes(app: string): Set<string> {
  const routes = new Set<string>();
  const dir = join(APPS_DIR, app, 'src');
  const files: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d)) {
      if (['node_modules', 'dist'].includes(entry)) continue;
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (entry.endsWith('.controller.ts')) files.push(full);
    }
  };
  try {
    walk(dir);
  } catch {
    return routes;
  }

  for (const file of files) {
    const src = stripComments(readFileSync(file, 'utf8'));
    // A file may hold several controllers, each with its own prefix.
    const blocks = src.split(/@Controller\(/).slice(1);
    for (const block of blocks) {
      const prefixMatch = block.match(/^\s*['"`]([^'"`]*)['"`]/);
      const prefix = prefixMatch ? prefixMatch[1] : '';
      for (const m of block.matchAll(/@(Get|Post|Put|Patch|Delete)\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)/g)) {
        const method = m[1].toUpperCase();
        const sub = m[2] ?? '';
        const path = `/${[prefix, sub].filter(Boolean).join('/')}`.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
        routes.add(`${method} ${path}`);
      }
    }
  }
  return routes;
}

interface CallSite {
  service: string;
  path: string;
  file: string;
}

/** Every `${serviceUrl('svc')}/some/path` in the repo. */
function callSites(): CallSite[] {
  const out: CallSite[] = [];
  for (const file of [...sourceFiles(APPS_DIR), ...sourceFiles(LIBS_DIR)]) {
    const src = stripComments(readFileSync(file, 'utf8'));
    for (const m of src.matchAll(/serviceUrl\(\s*['"`]([a-z]+)['"`][^)]*\)\}([^`'"]*)/g)) {
      const path = m[2].split('?')[0].replace(/\/$/, '');
      if (!path) continue; // the path is built elsewhere; nothing to check here
      out.push({ service: m[1], path, file: file.slice(REPO_ROOT.length + 1) });
    }
  }
  return out;
}

/**
 * Does `path` match any mounted route?
 *
 * Both sides can have wildcards and they mean different things. A route's `:id` is a parameter.
 * A caller's `${...}` may be a value for that parameter *or* a literal chosen at runtime —
 * `/internal/inventory/${action}` targets three real routes named reserve/release/consume. So a
 * wildcard on either side matches whatever is opposite it, and only literal-vs-literal segments
 * have to be equal.
 */
function resolves(path: string, routes: Set<string>): boolean {
  const callSegs = path.split('/').map((s) => (/\$\{[^}]*\}/.test(s) ? null : s));
  for (const route of routes) {
    const routeSegs = route
      .slice(route.indexOf(' ') + 1)
      .split('/')
      .map((s) => (s.startsWith(':') ? null : s));
    if (routeSegs.length !== callSegs.length) continue;
    if (callSegs.every((seg, i) => seg === null || routeSegs[i] === null || seg === routeSegs[i])) return true;
  }
  return false;
}

describe('cross-service URLs resolve to a route the callee mounts', () => {
  const services = readdirSync(APPS_DIR).filter((a) => !NOT_A_SERVICE.has(a));
  const routesByService = new Map(services.map((s) => [s, mountedRoutes(s)] as const));
  const sites = callSites();

  it('finds call sites and routes to compare', () => {
    expect(sites.length).toBeGreaterThan(30);
    expect(routesByService.get('auth')!.size).toBeGreaterThan(20);
    expect(routesByService.get('order')!.size).toBeGreaterThan(20);
  });

  it('every literal cross-service path exists on the target service', () => {
    const broken = sites
      .filter((s) => routesByService.has(s.service))
      // A path that is entirely interpolated (`${base}${path}`) is assembled by the caller and
      // checked at its own definition site instead.
      .filter((s) => !/^\$\{[^}]*\}$/.test(s.path))
      .filter((s) => !resolves(s.path, routesByService.get(s.service)!))
      .map((s) => `${s.file}: ${s.service}${s.path}`);

    expect(broken).toEqual([]);
  });

  it('the auth service keeps its /auth prefix on internal routes', () => {
    // The specific shape of the COD bug: auth is the only service whose internal routes are
    // nested under a controller prefix, so it is the one everybody gets wrong.
    const authInternal = sites.filter((s) => s.service === 'auth' && s.path.includes('internal'));
    expect(authInternal.length).toBeGreaterThan(0);
    for (const site of authInternal) {
      expect(`${site.file} -> ${site.path}`).toMatch(/-> \/auth\/internal\//);
    }
  });
});
