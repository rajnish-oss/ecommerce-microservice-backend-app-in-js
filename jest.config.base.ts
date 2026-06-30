/** @jest-config-loader ts-node */
// or
/** @jest-config-loader esbuild-register */
import { defineConfig } from 'jest';

export default defineConfig({
  verbose: true,
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
});