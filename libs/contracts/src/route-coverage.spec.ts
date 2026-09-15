/**
 * Route-coverage contract: no admin route without a declared permission.
 *
 * WHY THIS IS A TEST AND NOT A REVIEW
 * `PermissionGuard` fails closed — an admin-only route with no `@RequirePermission` denies
 * everyone, super admin included. That is the safe failure, but it is still a route that does
 * not work, and it is invisible until someone clicks it. The opposite mistake is worse: a route
 * that declares a permission *not in the matrix* also locks everyone out, because the guard
 * denies what the matrix does not list.
 *
 * Both are caught by reading the source, which is cheap and runs on every test pass. Three
 * phases in a row produced a bug of exactly this shape, so it is now a contract.
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { ALL_PERMISSIONS } from './admin-permissions';

const REPO_ROOT = join(__dirname, '..', '..', '..');
const APPS_DIR = join(REPO_ROOT, 'apps');

interface Route {
  file: string;
  method: string;
  path: string;
  hasPermission: boolean;
  permission: string | null;
  isPublic: boolean;
  isInternal: boolean;
  adminOnly: boolean;
}

function controllerFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.next') continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (entry.endsWith('.controller.ts')) out.push(full);
    }
  };
  for (const app of readdirSync(APPS_DIR)) {
    const src = join(APPS_DIR, app, 'src');
    try {
      if (statSync(src).isDirectory()) walk(src);
    } catch {
      // app with no src dir — nothing to scan
    }
  }
  return out;
}

/**
 * Split a controller into route blocks.
 *
 * Decorators in Nest apply to the member that follows them, so a route's decorators are
 * everything between the end of the previous member and its own signature. Scanning by
 * "decorators seen since the last method" reproduces that without a full TS parse, which a
 * contract test has no business depending on.
 */
function routesIn(file: string): Route[] {
  const src = readFileSync(file, 'utf8');
  // Strip block and line comments: a decorator inside a comment would otherwise be read as
  // real, which is how a documented example becomes a phantom route.
  const clean = src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  const routes: Route[] = [];
  const lines = clean.split('\n');
  let pending: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('@')) {
      pending.push(line);
      continue;
    }
    const verb = line.match(/^@(Get|Post|Patch|Put|Delete)\((.*)\)/);
    if (verb) {
      pending.push(line);
      continue;
    }
    // A member signature (or a closing brace) ends the decorator run.
    const isMember = /^([a-zA-Z_$][\w$]*)\s*\(/.test(line) || /^(async\s+)?[a-zA-Z_$][\w$]*\s*\(/.test(line);
    if (!pending.length || (!isMember && !line.startsWith('}'))) continue;

    const block = pending.join('\n');
    const httpMatch = block.match(/@(Get|Post|Patch|Put|Delete)\(([^)]*)\)/);
    if (httpMatch && isMember) {
      const permMatch = block.match(/@RequirePermission\(\s*'([^']+)'/);
      routes.push({
        file,
        method: httpMatch[1].toUpperCase(),
        path: (httpMatch[2] || '').replace(/['"]/g, ''),
        hasPermission: !!permMatch,
        permission: permMatch ? permMatch[1] : null,
        isPublic: /@Public\(\)/.test(block),
        isInternal: /@Internal\(\)/.test(block),
        adminOnly: /@Roles\(\s*Role\.ADMIN\s*\)/.test(block),
      });
    }
    pending = [];
  }
  return routes;
}

const ALL_ROUTES = controllerFiles().flatMap(routesIn);
const rel = (f: string) => f.replace(`${REPO_ROOT}/`, '');

describe('route coverage — every admin route declares a permission', () => {
  it('found controllers to scan (the scan itself works)', () => {
    // A scan that silently finds nothing passes every assertion below while testing nothing.
    expect(controllerFiles().length).toBeGreaterThan(10);
    expect(ALL_ROUTES.length).toBeGreaterThan(50);
  });

  it('no admin-only route is missing @RequirePermission', () => {
    const offenders = ALL_ROUTES.filter((r) => r.adminOnly && !r.hasPermission && !r.isPublic && !r.isInternal);
    expect(offenders.map((r) => `${rel(r.file)} ${r.method} ${r.path}`)).toEqual([]);
  });

  it('every declared permission exists in the matrix', () => {
    // A permission string that is not in the matrix denies everyone, super admin included.
    const known = new Set<string>(ALL_PERMISSIONS as string[]);
    const offenders = ALL_ROUTES.filter((r) => r.permission && !known.has(r.permission));
    expect(offenders.map((r) => `${rel(r.file)} ${r.method} ${r.path} → ${r.permission}`)).toEqual([]);
  });

  it('no route is both @Public and permission-guarded', () => {
    // @Public short-circuits the guard, so a permission on the same route is decoration: it
    // reads as protected and is not.
    const offenders = ALL_ROUTES.filter((r) => r.isPublic && r.hasPermission);
    expect(offenders.map((r) => `${rel(r.file)} ${r.method} ${r.path}`)).toEqual([]);
  });

  it('no @Internal route also declares a permission', () => {
    // Same shape of contradiction: @Internal is keyed by the service key, not by a JWT, so a
    // permission can never be evaluated for it.
    const offenders = ALL_ROUTES.filter((r) => r.isInternal && r.hasPermission);
    expect(offenders.map((r) => `${rel(r.file)} ${r.method} ${r.path}`)).toEqual([]);
  });

  it('every admin surface that writes money or identity is guarded somewhere', () => {
    // A crude but useful tripwire: the high-risk surfaces must have at least one guarded route
    // each. If a whole controller loses its decorators, the assertions above catch the routes;
    // this catches a controller being deleted or renamed out of the scan.
    const guarded = new Set(ALL_ROUTES.filter((r) => r.hasPermission).map((r) => rel(r.file)));
    for (const needle of ['ledger.controller.ts', 'admin.controller.ts', 'customer.controller.ts']) {
      expect([...guarded].some((f) => f.endsWith(needle))).toBe(true);
    }
  });
});
