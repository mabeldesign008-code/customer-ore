import { internalFetch } from './http';
import { breakerFor } from './breaker';
import { INTERNAL_KEY_HEADER } from '@ore/config';
import { INTERNAL_MAC_HEADER, INTERNAL_SERVICE_HEADER, INTERNAL_TS_HEADER } from './internal-auth';

/**
 * `internalFetch` is the only path between services, so its retry policy decides whether a
 * transient blip is absorbed or amplified — and, for non-idempotent calls, whether a payment can
 * be taken twice.
 */
describe('internalFetch', () => {
  let fetchMock: jest.Mock;
  let host: string;
  let url: string;
  let counter = 0;

  const ok = (body: unknown = { ok: true }) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  const status = (code: number) => new Response('{}', { status: code });

  beforeEach(() => {
    // A fresh host per test: breakers are module-global and keyed by host, so a tripped breaker
    // would otherwise leak into the next test and fail it for the wrong reason.
    counter += 1;
    host = `svc-${counter}.test:4100`;
    url = `http://${host}/internal/thing`;
    breakerFor(host).reset();

    fetchMock = jest.fn().mockResolvedValue(ok());
    global.fetch = fetchMock as never;
  });

  afterEach(() => {
    breakerFor(host).reset();
    jest.restoreAllMocks();
  });

  describe('happy path', () => {
    it('returns the response without retrying', async () => {
      const res = await internalFetch(url);
      expect(res.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('signs the request with a MAC so the shared key never crosses the wire', async () => {
      await internalFetch(url, { method: 'POST', body: JSON.stringify({ a: 1 }) });

      const headers = fetchMock.mock.calls[0][1].headers as Headers;
      expect(headers.get(INTERNAL_MAC_HEADER)).toMatch(/^[0-9a-f]{64}$/);
      expect(headers.get(INTERNAL_TS_HEADER)).toMatch(/^\d{13}$/);
      expect(headers.get(INTERNAL_SERVICE_HEADER)).toBeTruthy();
    });

    it('still sends the legacy key for mixed-version rolling deploys', async () => {
      await internalFetch(url);
      expect((fetchMock.mock.calls[0][1].headers as Headers).get(INTERNAL_KEY_HEADER)).toBeTruthy();
    });

    it('defaults the content type for a body', async () => {
      await internalFetch(url, { method: 'POST', body: JSON.stringify({ a: 1 }) });
      expect((fetchMock.mock.calls[0][1].headers as Headers).get('content-type')).toBe('application/json');
    });

    it('passes a 4xx straight back without retrying', async () => {
      // A 404 or a 422 is an answer, not a failure. Retrying it wastes time and hides the bug.
      fetchMock.mockResolvedValue(status(404));
      const res = await internalFetch(url);

      expect(res.status).toBe(404);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('retries — only where a repeat is safe', () => {
    it('retries a GET through a 500 and returns the eventual success', async () => {
      fetchMock.mockResolvedValueOnce(status(500)).mockResolvedValueOnce(ok({ recovered: true }));

      const res = await internalFetch(url);

      expect(res.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries a GET on 429', async () => {
      fetchMock.mockResolvedValueOnce(status(429)).mockResolvedValueOnce(ok());
      await internalFetch(url);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('never retries a POST', async () => {
      // The upstream may have already processed it and merely failed to answer in time.
      // Re-sending is how one checkout becomes two charges (audit F-BUG-1).
      fetchMock.mockResolvedValue(status(500));

      const res = await internalFetch(url, { method: 'POST', body: '{}' });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(500);
    });

    it('never retries a PATCH', async () => {
      fetchMock.mockResolvedValue(status(503));
      await internalFetch(url, { method: 'PATCH', body: '{}' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('never retries a DELETE', async () => {
      fetchMock.mockResolvedValue(status(500));
      await internalFetch(url, { method: 'DELETE' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does retry a PUT, which is idempotent by definition', async () => {
      fetchMock.mockResolvedValueOnce(status(500)).mockResolvedValueOnce(ok());
      await internalFetch(url, { method: 'PUT', body: '{}' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('retries a network-level failure on a GET', async () => {
      fetchMock.mockRejectedValueOnce(new Error('fetch failed')).mockResolvedValueOnce(ok());
      await internalFetch(url);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not retry a network failure on a POST either', async () => {
      // A connection reset says nothing about whether the server processed the request.
      fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
      await expect(internalFetch(url, { method: 'POST', body: '{}' })).rejects.toThrow();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('gives up after a bounded number of attempts', async () => {
      fetchMock.mockResolvedValue(status(500));
      const res = await internalFetch(url);

      expect(fetchMock).toHaveBeenCalledTimes(4); // initial + 3 retries
      expect(res.status).toBe(500);
    });

    it('surfaces the upstream status rather than throwing, once retries are spent', async () => {
      // Callers branch on `res.ok`; turning an exhausted 503 into a thrown Error would make
      // every call site need a try/catch it does not have.
      fetchMock.mockResolvedValue(status(503));
      const res = await internalFetch(url);
      expect(res.status).toBe(503);
    });
  });

  describe('circuit breaker', () => {
    it('opens after repeated failures and stops calling the upstream', async () => {
      fetchMock.mockResolvedValue(status(500));

      // First call: 4 attempts, 4 failures — one short of the 5-failure threshold.
      await internalFetch(url);
      expect(fetchMock).toHaveBeenCalledTimes(4);

      // Second call: its first attempt is the 5th failure and trips the breaker, so the retry
      // loop refuses to continue.
      await expect(internalFetch(url)).rejects.toThrow(/circuit open/);
      expect(fetchMock).toHaveBeenCalledTimes(5);

      // Everything after that is rejected without touching the network. That is the point:
      // continuing to retry against a host that is already down is how one service's outage
      // becomes everyone's.
      await expect(internalFetch(url)).rejects.toThrow(/circuit open/);
      await expect(internalFetch(url)).rejects.toThrow(/circuit open/);
      expect(fetchMock).toHaveBeenCalledTimes(5);
    });

    it('does not trip on one host because another is failing', async () => {
      fetchMock.mockResolvedValue(status(500));
      await internalFetch(url);
      await internalFetch(url).catch(() => undefined);

      const otherHost = `other-${counter}.test:4200`;
      breakerFor(otherHost).reset();
      fetchMock.mockResolvedValue(ok());

      await expect(internalFetch(`http://${otherHost}/internal/thing`)).resolves.toMatchObject({ status: 200 });
      breakerFor(otherHost).reset();
    });

    it('closes again after a successful call', async () => {
      fetchMock.mockResolvedValueOnce(status(500)).mockResolvedValue(ok());
      await internalFetch(url);
      expect(breakerFor(host).state).toBe('closed');
    });
  });

  describe('caller-supplied abort', () => {
    it('aborts immediately when the caller signal is already aborted', async () => {
      const ctrl = new AbortController();
      ctrl.abort();
      fetchMock.mockImplementation((_u: string, init: RequestInit) => {
        if (init.signal?.aborted) return Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        return Promise.resolve(ok());
      });

      await expect(internalFetch(url, { method: 'POST', signal: ctrl.signal })).rejects.toThrow();
    });
  });
});
