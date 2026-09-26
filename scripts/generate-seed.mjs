/**
 * Generates migrations/0002_seed_projects.sql from the existing src/data.ts.
 *
 * Deriving the seed from the current source is what guarantees no portfolio content is
 * lost in the move to D1. Re-run this only if the original seed content must change.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const require = createRequire(import.meta.url)
const ts = require('typescript')

// Transpile data.ts to JS so we can import the real values rather than parse by hand.
const source = await readFile(join(root, 'src/data.ts'), 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const dataUrl = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
const { projects } = await import(dataUrl)

const q = value => "'" + String(value ?? '').replaceAll("'", "''") + "'"
const json = value => q(JSON.stringify(value ?? []))

// Map the legacy tier/filters onto the new project_type vocabulary.
const typeOf = p => {
  if (p.filters.includes('Production')) return 'production'
  if (p.filters.includes('Full-stack')) return 'fullstack'
  if (p.filters.includes('Landing Page')) return 'landing'
  return 'concept'
}

const rows = projects.map((p, i) => `(
  ${q(p.id)}, ${q(p.name)}, ${q(p.category)}, ${q(typeOf(p))}, ${q(p.status)}, ${q(p.year)},
  ${q(p.role)}, ${q(p.headline)}, ${q(p.description)}, ${q(p.domain)}, ${q(p.scope)}, ${q(p.accent)},
  ${json(p.tech)}, ${json(p.filters)}, ${json(p.scenes)}, ${json(p.features)},
  ${q(p.problem)}, ${q(p.overview)}, ${q(p.problem)}, ${q(p.solution)}, ${q(p.design)},
  ${q(p.development)}, ${q(p.challenge)}, ${q(p.resolution)}, ${q(p.result)},
  ${q(p.href || '')}, ${q(p.liveLabel || '')}, '',
  ${q(p.image)}, ${q(p.image)}, ${q(p.mobile)}, ${q(p.detail)},
  ${p.tier === 'concept' ? 0 : 1}, ${(i + 1) * 10}, 1
)`).join(',\n')

const sql = `-- Seed the portfolio projects.
--
-- Generated from src/data.ts by scripts/generate-seed.mjs so the migration carries the
-- exact copy, imagery and case-study text the site already shipped. Idempotent: running
-- it twice leaves one row per slug.

INSERT OR IGNORE INTO projects (
  slug, title, category, project_type, status, year,
  role, headline, short_description, domain, scope, accent,
  tech_stack, filters, scenes, features,
  goal, overview, problem, solution, design_approach,
  development_details, challenges, resolution, result,
  live_url, live_label, github_url,
  cover_image, desktop_image, mobile_image, detail_image,
  featured, sort_order, is_published
) VALUES
${rows};
`

await writeFile(join(root, 'migrations/0002_seed_projects.sql'), sql)
console.log(`Wrote migrations/0002_seed_projects.sql (${projects.length} projects)`)
