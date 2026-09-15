import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const GATEWAY = process.env.GATEWAY_URL || 'http://127.0.0.1:4000';
const AT = 'ore_admin_at';
const RT = 'ore_admin_rt';

function cookieBase() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  };
}

function gatewayUrl(path: string[], search: string): string {
  return `${GATEWAY}/api/${path.join('/')}${search}`;
}

async function forward(req: NextRequest, path: string[], access?: string): Promise<Response> {
  const headers: Record<string, string> = { accept: 'application/json' };
  const contentType = req.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;
  if (access) headers.authorization = `Bearer ${access}`;
  const method = req.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await req.text();
  return fetch(gatewayUrl(path, req.nextUrl.search), {
    method,
    headers,
    body: body || undefined,
    cache: 'no-store',
  });
}

async function refreshAccess(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string } | null> {
  const res = await fetch(`${GATEWAY}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ refreshToken }),
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return (await res.json()) as { accessToken: string; refreshToken?: string };
}

function attachAuthCookies(out: NextResponse, access: string, refresh?: string) {
  out.cookies.set(AT, access, { ...cookieBase(), maxAge: 60 * 60 * 24 * 7 });
  if (refresh) out.cookies.set(RT, refresh, { ...cookieBase(), maxAge: 60 * 60 * 24 * 30 });
}

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const jar = cookies();
  const isLogin = path.join('/') === 'auth/admin/login';
  const isLogout = path.join('/') === 'session' && req.method.toUpperCase() === 'DELETE';

  if (isLogout) {
    const out = NextResponse.json({ ok: true });
    // Invalidate the server-side refresh token BEFORE clearing the cookies (audit
    // F-SEC-13). The old handler short-circuited locally, so a captured refresh token
    // kept minting access tokens for up to 30 days after "logout". Best-effort: if the
    // gateway is unreachable we still clear the local cookies.
    const rt = jar.get(RT)?.value;
    const at = jar.get(AT)?.value;
    if (rt) {
      try {
        await fetch(`${GATEWAY}/api/auth/session/revoke`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            ...(at ? { authorization: `Bearer ${at}` } : {}),
          },
          body: JSON.stringify({ refreshToken: rt }),
          cache: 'no-store',
        });
      } catch {
        // gateway unreachable — fall through to local cookie clear
      }
    }
    out.cookies.set(AT, '', { ...cookieBase(), maxAge: 0 });
    out.cookies.set(RT, '', { ...cookieBase(), maxAge: 0 });
    return out;
  }

  let access = jar.get(AT)?.value;
  let pendingRefresh: { accessToken: string; refreshToken?: string } | null = null;
  let upstream = await forward(req, path, isLogin ? undefined : access);

  if (upstream.status === 401 && !isLogin) {
    const refresh = jar.get(RT)?.value;
    if (refresh) {
      pendingRefresh = await refreshAccess(refresh);
      if (pendingRefresh?.accessToken) {
        access = pendingRefresh.accessToken;
        upstream = await forward(req, path, access);
      }
    }
  }

  const text = await upstream.text();
  if (isLogin && upstream.ok) {
    try {
      const tokens = JSON.parse(text) as {
        accessToken?: string;
        refreshToken?: string;
        user?: unknown;
        activeRole?: string;
        roles?: string[];
      };
      if (tokens.accessToken) {
        const out = NextResponse.json(
          { user: tokens.user, activeRole: tokens.activeRole, roles: tokens.roles },
          { status: 200 },
        );
        attachAuthCookies(out, tokens.accessToken, tokens.refreshToken);
        return out;
      }
    } catch {
      // fall through
    }
  }

  const out = new NextResponse(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' },
  });
  if (pendingRefresh?.accessToken) attachAuthCookies(out, pendingRefresh.accessToken, pendingRefresh.refreshToken);
  return out;
}

type Ctx = { params: { path: string[] } };

export function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
export function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
export function PATCH(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
export function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
export function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx.params.path);
}
