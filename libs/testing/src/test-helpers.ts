import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import supertest = require('supertest');

/**
 * Common test helpers and utilities
 */

/**
 * Creates a NestJS test application
 * Use this for E2E/integration tests that need the full HTTP server
 * 
 * Usage:
 * ```typescript
 * let app: INestApplication;
 * 
 * beforeAll(async () => {
 *   app = await createTestApplication({
 *     imports: [AppModule],
 *   });
 * });
 * 
 * afterAll(async () => {
 *   await app.close();
 * });
 * 
 * it('GET /users', () => {
 *   return request(app.getHttpServer())
 *     .get('/users')
 *     .expect(200);
 * });
 * ```
 */
export async function createTestApplication(
  moduleMetadata: any,
  overrides?: { provider: any; useValue: any }[],
): Promise<INestApplication> {
  let moduleBuilder = Test.createTestingModule(moduleMetadata);

  // Apply overrides if provided
  if (overrides) {
    for (const override of overrides) {
      moduleBuilder = moduleBuilder
        .overrideProvider(override.provider)
        .useValue(override.useValue);
    }
  }

  const module: TestingModule = await moduleBuilder.compile();
  const app = module.createNestApplication();
  await app.init();

  return app;
}

/**
 * Makes an authenticated HTTP request with a JWT token
 * Useful for testing protected endpoints
 * 
 * Usage:
 * ```typescript
 * const response = await authenticatedRequest(app, 'GET', '/profile', token);
 * ```
 */
export function authenticatedRequest(
  app: INestApplication,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  token: string,
  body?: any,
) {
  const req = supertest(app.getHttpServer() as any)
    [method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete'](path)
    .set('Authorization', `Bearer ${token}`);

  if (body) {
    req.send(body);
  }

  return req;
}

/**
 * Waits for a condition to be true with a timeout
 * Useful for testing async operations
 * 
 * Usage:
 * ```typescript
 * await waitFor(() => eventWasProcessed, 5000);
 * ```
 */
export async function waitFor(
  condition: () => boolean,
  timeoutMs: number = 5000,
  checkIntervalMs: number = 100,
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
    }
    await sleep(checkIntervalMs);
  }
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Flushes all pending promises
 * Useful for testing async behavior in Jest
 */
export function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Creates a mock repository for TypeORM
 * Use this when you want to unit test services without a real database
 * 
 * Usage:
 * ```typescript
 * const mockUserRepo = createMockRepository<User>();
 * 
 * await Test.createTestingModule({
 *   providers: [
 *     UserService,
 *     {
 *       provide: getRepositoryToken(User),
 *       useValue: mockUserRepo,
 *     },
 *   ],
 * }).compile();
 * ```
 */
export function createMockRepository<T = any>() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findOneOrFail: jest.fn(),
    findBy: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    query: jest.fn(),
    /**
     * Chainable query-builder stub. Every builder method returns the builder, so a chain of any
     * length works out of the box; tests override the terminal call they care about, e.g.
     * `repo.createQueryBuilder().getMany.mockResolvedValue([...])`.
     *
     * Without this, any service that reaches for a query builder — as the dispatch pool does —
     * cannot be unit-tested at all.
     */
    createQueryBuilder: jest.fn(() => {
      const qb: Record<string, jest.Mock> = {};
      const chain = [
        'select', 'addSelect', 'from', 'innerJoin', 'leftJoin', 'innerJoinAndSelect', 'leftJoinAndSelect',
        'where', 'andWhere', 'orWhere', 'orderBy', 'addOrderBy', 'groupBy', 'addGroupBy', 'having',
        'limit', 'offset', 'take', 'skip', 'setLock', 'setParameter', 'setParameters', 'distinct',
        // UPDATE/INSERT/DELETE builders: `createQueryBuilder().update(X).set({…}).where(…).execute()`
        'update', 'set', 'insert', 'values', 'delete', 'orUpdate', 'orIgnore',
      ];
      for (const m of chain) qb[m] = jest.fn(() => qb);
      qb.getMany = jest.fn().mockResolvedValue([]);
      qb.getOne = jest.fn().mockResolvedValue(null);
      qb.getRawMany = jest.fn().mockResolvedValue([]);
      qb.getRawOne = jest.fn().mockResolvedValue(undefined);
      qb.getCount = jest.fn().mockResolvedValue(0);
      qb.execute = jest.fn().mockResolvedValue(undefined);
      return qb;
    }),
    manager: {
      query: jest.fn(),
      transaction: jest.fn(),
    },
  };
}

/**
 * Captures console output during a test
 * Useful when you want to verify logging behavior
 * 
 * Usage:
 * ```typescript
 * const { logs, restore } = captureConsole();
 * 
 * myFunction(); // calls console.log
 * 
 * expect(logs).toContain('Expected message');
 * restore();
 * ```
 */
export function captureConsole() {
  const logs: string[] = [];
  const errors: string[] = [];
  const originalLog = console.log;
  const originalError = console.error;

  console.log = (...args: any[]) => {
    logs.push(args.join(' '));
  };

  console.error = (...args: any[]) => {
    errors.push(args.join(' '));
  };

  return {
    logs,
    errors,
    restore: () => {
      console.log = originalLog;
      console.error = originalError;
    },
  };
}

/**
 * Creates a spy on a service method that returns a promise
 * 
 * Usage:
 * ```typescript
 * spyOnMethod(userService, 'findById').mockResolvedValue(mockUser);
 * ```
 */
export function spyOnMethod<T extends object, K extends keyof T>(
  object: T,
  method: K,
): jest.SpyInstance {
  return jest.spyOn(object, method as any);
}

/**
 * Asserts that a promise rejects with a specific error
 * 
 * Usage:
 * ```typescript
 * await expectToReject(
 *   () => service.methodThatThrows(),
 *   BadRequestException
 * );
 * ```
 */
export async function expectToReject(
  fn: () => Promise<any>,
  expectedError?: any,
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to reject, but it resolved');
  } catch (error) {
    if (expectedError) {
      expect(error).toBeInstanceOf(expectedError);
    }
  }
}

/**
 * Deep clones an object for testing
 * Useful when you want to test with copies of data
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Generates a random string for testing
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Generates a random number between min and max
 */
export function randomNumber(min: number = 0, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
