import { InMemoryRateLimiter, RedisRateLimiter, createRateLimiter } from './rate-limiter';

describe('InMemoryRateLimiter', () => {
  it('allows up to the limit and refuses beyond it', async () => {
    const rl = new InMemoryRateLimiter();
    for (let i = 1; i <= 5; i++) {
      expect((await rl.hit('k', 5, 60_000)).allowed).toBe(true);
    }
    expect((await rl.hit('k', 5, 60_000)).allowed).toBe(false);
  });

  it('keeps refusing once over, rather than letting every other one through', async () => {
    const rl = new InMemoryRateLimiter();
    for (let i = 0; i < 5; i++) await rl.hit('k', 5, 60_000);
    for (let i = 0; i < 4; i++) {
      expect((await rl.hit('k', 5, 60_000)).allowed).toBe(false);
    }
  });

  it('counts keys independently', async () => {
    const rl = new InMemoryRateLimiter();
    for (let i = 0; i < 5; i++) await rl.hit('a', 5, 60_000);
    expect((await rl.hit('a', 5, 60_000)).allowed).toBe(false);
    expect((await rl.hit('b', 5, 60_000)).allowed).toBe(true);
  });

  it('opens a new window once the old one expires', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-04T10:00:00Z'));
    const rl = new InMemoryRateLimiter();
    for (let i = 0; i < 5; i++) await rl.hit('k', 5, 60_000);
    expect((await rl.hit('k', 5, 60_000)).allowed).toBe(false);

    jest.setSystemTime(new Date('2026-09-04T10:01:01Z'));
    const fresh = await rl.hit('k', 5, 60_000);
    expect(fresh.allowed).toBe(true);
    expect(fresh.count).toBe(1);
    jest.useRealTimers();
  });

  it('reports when the window resets so the caller can say "try again in N"', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-04T10:00:00Z'));
    const rl = new InMemoryRateLimiter();
    const { resetAt } = await rl.hit('k', 5, 600_000);
    expect(resetAt.toISOString()).toBe('2026-09-04T10:10:00.000Z');
    jest.useRealTimers();
  });

  it('resets a key on demand', async () => {
    const rl = new InMemoryRateLimiter();
    for (let i = 0; i < 5; i++) await rl.hit('k', 5, 60_000);
    await rl.reset('k');
    expect((await rl.hit('k', 5, 60_000)).allowed).toBe(true);
  });

  it('does not grow without bound when keys are enumerated', async () => {
    // The key is a phone number, so an attacker chooses it. An unbounded map turns a rate
    // limiter into a memory-exhaustion vector.
    const rl = new InMemoryRateLimiter();
    for (let i = 0; i < 60_000; i++) await rl.hit(`phone-${i}`, 5, 600_000);

    const size = (rl as never as { windows: Map<string, unknown> }).windows.size;
    expect(size).toBeLessThanOrEqual(50_000);
  });

  it('never wipes every window at once when it evicts', async () => {
    // A wholesale clear() hands every currently-limited attacker a fresh budget at exactly the
    // moment the map is fullest — which is the moment an attack is underway.
    const rl = new InMemoryRateLimiter();
    for (let i = 0; i < 60_000; i++) await rl.hit(`phone-${i}`, 5, 600_000);

    const size = (rl as never as { windows: Map<string, unknown> }).windows.size;
    expect(size).toBeGreaterThan(1_000);
  });

  it('is exact at the boundary: the limit-th hit passes, the next does not', async () => {
    const rl = new InMemoryRateLimiter();
    expect((await rl.hit('k', 1, 60_000)).allowed).toBe(true);
    expect((await rl.hit('k', 1, 60_000)).allowed).toBe(false);
  });
});

describe('RedisRateLimiter', () => {
  const redisStub = (incrResults: number[], ttl = 60_000) => {
    let call = 0;
    const pexpire = jest.fn().mockResolvedValue('OK');
    const del = jest.fn().mockResolvedValue(1);
    return {
      pexpire,
      del,
      multi: () => ({
        incr: () => ({
          pttl: () => ({
            exec: async () => [
              [null, incrResults[call++] ?? 1],
              [null, ttl],
            ],
          }),
        }),
      }),
    };
  };

  it('allows while INCR is at or below the limit', async () => {
    const rl = new RedisRateLimiter(redisStub([1, 2, 5]) as never);
    expect((await rl.hit('k', 5, 60_000)).allowed).toBe(true);
    expect((await rl.hit('k', 5, 60_000)).allowed).toBe(true);
    expect((await rl.hit('k', 5, 60_000)).allowed).toBe(true);
  });

  it('refuses once INCR passes the limit', async () => {
    const rl = new RedisRateLimiter(redisStub([6]) as never);
    expect((await rl.hit('k', 5, 60_000)).allowed).toBe(false);
  });

  it('sets the TTL on the first hit of a window', async () => {
    const redis = redisStub([1]);
    await new RedisRateLimiter(redis as never).hit('k', 5, 60_000);
    expect(redis.pexpire).toHaveBeenCalledWith('ore:rl:k', 60_000);
  });

  it('does not reset the TTL on later hits, which would make the window slide forever', async () => {
    const redis = redisStub([3]);
    await new RedisRateLimiter(redis as never).hit('k', 5, 60_000);
    expect(redis.pexpire).not.toHaveBeenCalled();
  });

  it('repairs a key that somehow has no expiry', async () => {
    // A key with no TTL never expires, which would lock a phone number out permanently.
    const redis = redisStub([3], -1);
    await new RedisRateLimiter(redis as never).hit('k', 5, 60_000);
    expect(redis.pexpire).toHaveBeenCalledWith('ore:rl:k', 60_000);
  });

  it('namespaces its keys', async () => {
    const redis = redisStub([1]);
    await new RedisRateLimiter(redis as never).hit('otp:233501234567', 5, 60_000);
    expect(redis.pexpire).toHaveBeenCalledWith('ore:rl:otp:233501234567', 60_000);
  });

  it('falls back to in-memory when Redis is down, rather than locking everyone out', async () => {
    const broken = {
      multi: () => ({ incr: () => ({ pttl: () => ({ exec: async () => { throw new Error('ECONNREFUSED'); } }) }) }),
      pexpire: jest.fn(),
      del: jest.fn(),
    };
    const fallback = new InMemoryRateLimiter();
    const rl = new RedisRateLimiter(broken as never, fallback);
    jest.spyOn((rl as never as { logger: { error: jest.Mock } }).logger, 'error').mockImplementation(() => undefined);

    // A Redis outage must not stop the whole country logging in...
    expect((await rl.hit('k', 5, 60_000)).allowed).toBe(true);
    // ...but the limit must still bite per replica, not vanish.
    for (let i = 0; i < 4; i++) await rl.hit('k', 5, 60_000);
    expect((await rl.hit('k', 5, 60_000)).allowed).toBe(false);
  });

  it('treats an aborted transaction as a Redis failure', async () => {
    const aborted = {
      multi: () => ({ incr: () => ({ pttl: () => ({ exec: async () => null }) }) }),
      pexpire: jest.fn(),
      del: jest.fn(),
    };
    const rl = new RedisRateLimiter(aborted as never);
    jest.spyOn((rl as never as { logger: { error: jest.Mock } }).logger, 'error').mockImplementation(() => undefined);

    expect((await rl.hit('k', 5, 60_000)).allowed).toBe(true);
  });

  it('does not throw when reset cannot reach Redis', async () => {
    const broken = { multi: jest.fn(), pexpire: jest.fn(), del: jest.fn().mockRejectedValue(new Error('down')) };
    await expect(new RedisRateLimiter(broken as never).reset('k')).resolves.toBeUndefined();
  });
});

describe('createRateLimiter', () => {
  it('uses the in-memory limiter when no REDIS_URL is configured', () => {
    expect(createRateLimiter()).toBeInstanceOf(InMemoryRateLimiter);
    expect(createRateLimiter('')).toBeInstanceOf(InMemoryRateLimiter);
  });
});
