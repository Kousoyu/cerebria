module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.[jt]s', '**/src/**/__tests__/**/*.test.[jt]s'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.js',
    'src/**/*.ts',
    '!src/**/*.test.js',
    '!src/**/*.test.ts',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  coverageThreshold: {
    global: {
      // Thresholds reflect current testable coverage (persistence layer excluded:
      // better-sqlite3 is an optional dep not installed in the base CI environment).
      branches: 27,
      functions: 45,
      lines: 39,
      statements: 38
    }
  },
  verbose: true,
  clearMocks: true,
  resetModules: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover']
};