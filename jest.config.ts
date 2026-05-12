import type { Config } from 'jest'

const config: Config = {
  roots: ['test'],
  testPathIgnorePatterns: ['node_modules', 'lib'],
  testEnvironment: 'node',
  testTimeout: 15000,
  reporters: ['default', 'github-actions'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['lcov', 'text'],
  coveragePathIgnorePatterns: ['node_modules', 'lib'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json'
      }
    ]
  }
}

export default config
