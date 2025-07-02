// jest.config.js
export default {
  preset: 'ts-jest/presets/default-esm', // Use the ESM preset
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1' // Fix ESM import paths in TS
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }]
  },
  testMatch: ['**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  verbose: true
}
