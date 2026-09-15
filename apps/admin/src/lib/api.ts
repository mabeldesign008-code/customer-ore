export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** The gateway could not be reached at all. Distinct from a real API rejection. */
export class NetworkError extends Error {
  constructor(
    public path: string,
    cause?: unknown,
  ) {
    super(`Could not reach the Ore gateway for ${path}`);
    this.name = 'NetworkError';
  }
}

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Call the backend through the Next.js gateway proxy.
 *
 * NOTE: this used to swallow every failure and return fabricated demo data
 * (`MOCK_DATA`). That has been removed on purpose. A 403 from the backend is a
 * real answer — "you may not do this" — and turning it into a fake rider list
 * makes role-based access control impossible to observe, let alone trust.
 * Errors now propagate: `ApiError` for a backend rejection, `NetworkError` for
 * an unreachable gateway. Callers render them.
 */
export async function gw<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has('content-type')) headers.set('content-type', 'application/json');

  let res: Response;
  try {
    res = await fetch(`/gw/${path.replace(/^\//, '')}`, {
      ...init,
      headers,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch (err) {
    throw new NetworkError(path, err);
  }

  const data = await parse(res);
  if (!res.ok) {
    const err =
      data && typeof data === 'object' && 'error' in data
        ? (data as { error?: { code?: string; message?: string } }).error
        : undefined;
    throw new ApiError(res.status, err?.code || 'ERROR', err?.message || res.statusText);
  }
  return data as T;
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return gw<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
}
