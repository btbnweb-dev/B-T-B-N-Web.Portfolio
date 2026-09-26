/**
 * Fails the build if a secret-bearing file was copied into dist/.
 *
 * The Cloudflare Vite plugin stages .dev.vars next to the built Worker so `wrangler dev`
 * can read it. That file must never travel with a deployed bundle, so it is removed here
 * and the build is failed if any recognisable secret survives.
 */
import { readFile, rm, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

for (const name of ['.dev.vars', '.env', '.env.local']) {
  for (const dir of ['', 'btbn_web_portfolio', 'client']) {
    await rm(join(dist, dir, name), { force: true })
  }
}

const PATTERNS = [/GOCSPX-[A-Za-z0-9_-]{10,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/]
const findings = []
async function walk(dir) {
  let entries
  try { entries = await readdir(dir) } catch { return }
  for (const entry of entries) {
    const full = join(dir, entry)
    const info = await stat(full)
    if (info.isDirectory()) { await walk(full); continue }
    if (info.size > 8_000_000) continue
    const text = await readFile(full, 'utf8').catch(() => '')
    for (const pattern of PATTERNS) if (pattern.test(text)) findings.push(full)
  }
}
await walk(dist)

if (findings.length) {
  console.error('Build contains secrets:\n' + findings.map(f => '  ' + f).join('\n'))
  process.exit(1)
}
console.log('Build secret scan: clean.')
