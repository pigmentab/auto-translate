import path from 'path'
import { loadEnv } from 'payload/node'
import { fileURLToPath } from 'url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { configDefaults, defineConfig } from 'vitest/config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default defineConfig(() => {
  loadEnv(path.resolve(dirname, './dev'))

  return {
    plugins: [
      tsconfigPaths({
        ignoreConfigErrors: true,
      }),
    ],
    test: {
      environment: 'node',
      // dev/e2e.spec.ts is a Playwright test (run via `pnpm test:e2e`), not a vitest test.
      // dev/drafts-autosave.test.ts also uses the Playwright test API but isn't matched by
      // playwright.config.js's testMatch either, so it currently doesn't run under any runner.
      exclude: [...configDefaults.exclude, 'dev/e2e.spec.ts', 'dev/drafts-autosave.test.ts'],
      hookTimeout: 30_000,
      testTimeout: 30_000,
    },
  }
})
