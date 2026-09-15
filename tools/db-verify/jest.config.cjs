module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testTimeout: 120_000,
  moduleNameMapper: { '^@ore/(.*)$': '<rootDir>/../../libs/$1/src' },
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json', diagnostics: false }] },
};
