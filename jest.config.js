module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js', '**/src/**/__tests__/**/*.test.ts'],
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
      // Realistic thresholds for current implementation state
      branches: 30,
      functions: 30,
      lines: 35,
      statements: 35
    }
  },
  verbose: true,
  clearMocks: true,
  resetModules: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover']
};