/** Drops the local Miniflare D1 state so migrations re-run from scratch. Local only. */
import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
await rm(join(root, '.wrangler/state/v3/d1'), { recursive: true, force: true })
console.log('Local D1 state removed. Run `npm run db:migrate:local` to rebuild and reseed.')
