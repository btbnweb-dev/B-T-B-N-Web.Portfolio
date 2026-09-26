import { defineConfig } from '@playwright/test'
const production = process.env.PORTFOLIO_PRODUCTION === '1'
const port = production ? 4177 : 4176
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:' + port,
    browserName: 'chromium',
    reducedMotion: 'reduce',
    // Non-browser API clients must declare intent; the Worker refuses anonymous writes
    // that carry neither Origin nor Referer. See worker/lib/security.ts.
    extraHTTPHeaders: { 'x-requested-with': 'btbn-admin' },
  },
  projects: [
    // The CMS suite creates, publishes and deletes rows in the one shared local D1
    // database. The portfolio suite reads that same data, so running them concurrently
    // lets a row vanish mid-render. `dependencies` makes the portfolio suite wait until
    // the CMS suite has finished and cleaned up.
    // The auth matrix drives the worker modules directly and touches no shared state.
    { name: 'auth', testMatch: /auth-matrix\.spec\.ts/ },
    // These two mutate the one shared local D1 database, so they run serially.
    { name: 'cms', testMatch: /cms\.spec\.ts/, fullyParallel: false, workers: 1 },
    { name: 'security', testMatch: /security\.spec\.ts/, fullyParallel: false, workers: 1, dependencies: ['cms'] },
    { name: 'portfolio', testMatch: /portfolio\.spec\.ts/, dependencies: ['security'] },
  ],
  webServer: {
    command: 'npm run ' + (production ? 'preview' : 'dev') + ' -- --host 127.0.0.1 --port ' + port + ' --strictPort',
    url: 'http://127.0.0.1:' + port,
    reuseExistingServer: !process.env.CI && !production,
    timeout: 180000,
  },
})
