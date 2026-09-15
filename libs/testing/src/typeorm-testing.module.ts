import { TypeOrmModule, TypeOrmModuleOptions, getDataSourceToken } from '@nestjs/typeorm';
import { DynamicModule } from '@nestjs/common';

/**
 * Creates an in-memory SQLite database for testing
 * Based on research from: https://dev.to/webeleon/unit-testing-nestjs-with-typeorm-in-memory-l6m
 * 
 * Usage in tests:
 * ```typescript
 * const module = await Test.createTestingModule({
 *   imports: [...TypeOrmSQLITETestingModule([User, Order])],
 *   providers: [UserService],
 * }).compile();
 * ```
 */
export function TypeOrmSQLITETestingModule(entities: any[]): DynamicModule[] {
  return [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: ':memory:',
      dropSchema: false,
      entities,
      synchronize: true,
      logging: false,
    } as TypeOrmModuleOptions),
    TypeOrmModule.forFeature(entities),
  ];
}

/**
 * Creates a test database configuration that can be customized
 * Useful when you need to override specific TypeORM options
 */
export function createTestDatabaseConfig(
  entities: any[],
  options: Partial<TypeOrmModuleOptions> = {},
): TypeOrmModuleOptions {
  return {
    type: 'better-sqlite3',
    database: ':memory:',
    dropSchema: true,
    entities,
    synchronize: true,
    logging: false,
    ...options,
  } as TypeOrmModuleOptions;
}

/**
 * Helper to seed test data
 * Call this in beforeEach after creating the test module
 * 
 * Usage:
 * ```typescript
 * beforeEach(async () => {
 *   const module = await Test.createTestingModule({...}).compile();
 *   await seedTestData(module, async (em) => {
 *     await em.insert(User, { name: 'Test User' });
 *   });
 * });
 * ```
 */
export async function seedTestData(
  module: any,
  seedFn: (entityManager: any) => Promise<void>,
): Promise<void> {
  const dataSource = module.get(getDataSourceToken());
  const entityManager = dataSource.createEntityManager();
  await seedFn(entityManager);
}

/**
 * Clears all data from the test database
 * Useful for cleaning up between tests
 */
export async function clearTestDatabase(module: any): Promise<void> {
  const dataSource = module.get(getDataSourceToken());
  const entities = dataSource.entityMetadatas;
  
  for (const entity of entities) {
    const repository = dataSource.getRepository(entity.name);
    await repository.clear();
  }
}
