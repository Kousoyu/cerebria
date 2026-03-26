module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
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