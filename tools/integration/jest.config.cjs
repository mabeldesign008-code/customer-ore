module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testTimeout: 180_000,
  // NATS connections keep the loop alive briefly after teardown; don't hang the run on it.
  forceExit: true,
  maxWorkers: 1,
  moduleNameMapper: { '^@ore/(.*)$': '<rootDir>/../../libs/$1/src' },
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', diagnostics: false }] },
};
