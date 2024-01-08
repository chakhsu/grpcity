import type { Config } from 'jest'

const config: Config = {
  roots: ['test'],
  testPathIgnorePatterns: ['node_modules', 'lib'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 15000,
  reporters: ['default', 'github-actions'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text'],
  coveragePathIgnorePatterns: ['node_modules', 'lib']
}

export default config
