import { defineConfig } from 'jest';

export default defineConfig({
  verbose: true,
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'ESNext',
          target: 'ES2022',
          moduleResolution: 'Bundler',
          allowImportingTsExtensions: true,
          esModuleInterop: true,
        },
      },
    ],
  },
});
