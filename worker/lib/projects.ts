import type { ProjectDTO, ProjectRow } from './types'

const PROJECT_TYPES = ['production', 'fullstack', 'landing', 'concept'] as const
const ACCENTS = ['citiled', 'gaming', 'coffee', 'beauty', 'build'] as const

/**
 * Maximum accepted length per text field. Anything longer is rejected rather than
 * silently truncated, so an oversized payload cannot quietly lose the author's content
 * or be used to bloat the database.
 */
const LIMITS: Record<string, number> = {
  title: 120, slug: 80, category: 80, status: 60, role: 120, headline: 300,
  shortDescription: 600, domain: 120, scope: 160, liveLabel: 120,
  goal: 4000, overview: 6000, problem: 6000, solution: 6000,
  designApproach: 6000, developmentDetails: 8000, challenges: 4000,
  resolution: 4000, result: 4000,
  liveUrl: 500, githubUrl: 500, coverImage: 500, desktopImage: 500, mobileImage: 500, detailImage: 500,
}
const MAX_TECH_ITEMS = 30
const MAX_TECH_ITEM_LEN = 40
const MAX_LIST_ITEMS = 24
const MAX_ITEM_TITLE = 160
const MAX_ITEM_TEXT = 1200
/** Whole-request ceiling, enforced before parsing. */
export const MAX_BODY_BYTES = 128 * 1024

const parseJson = <T>(value: string, fallback: T): T => {
  try {
    const parsed = JSON.parse(value || 'null')
    return parsed ?? fallback
  } catch { return fallback }
}

/** Converts a stored row into the shape the client consumes. */
export function toDTO(row: ProjectRow): ProjectDTO {
  const { tech_stack, filters, scenes, features, featured, is_published, ...rest } = row
  return {
    ...rest,
    techStack: parseJson<string[]>(tech_stack, []),
    filters: parseJson<string[]>(filters, []),
    scenes: parseJson<ProjectDTO['scenes']>(scenes, []),
    features: parseJson<ProjectDTO['features']>(features, []),
    featured: featured === 1,
    isPublished: is_published === 1,
  }
}

export type ValidationResult =
  | { ok: true; values: Record<string, string | number> }
  | { ok: false; errors: Record<string, string> }

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Accepts absolute http(s) URLs, or site-relative paths for local assets. */
function urlProblem(value: string, { allowRelative = false } = {}): string | null {
  if (!value) return null
  if (allowRelative && value.startsWith('/')) {
    return value.includes('..') ? 'Замд “..” байж болохгүй.' : null
  }
  let parsed: URL
  try { parsed = new URL(value) } catch { return 'Зөв URL оруулна уу (https://…).' }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return 'Зөвхөн http эсвэл https URL зөвшөөрнө.'
  return null
}

const str = (input: Record<string, unknown>, key: string) =>
  typeof input[key] === 'string' ? (input[key] as string).trim() : ''

/**
 * Server-side validation for admin create/update. Every field is checked here
 * regardless of what the browser did; the client form is a convenience, not a gate.
 */
export function validateProject(input: Record<string, unknown>): ValidationResult {
  const errors: Record<string, string> = {}

  const title = str(input, 'title')
  const slug = str(input, 'slug').toLowerCase()
  const category = str(input, 'category')
  const projectType = str(input, 'projectType') || 'concept'
  const accent = str(input, 'accent') || 'citiled'

  if (!title) errors.title = 'Гарчиг оруулна уу.'
  else if (title.length > 120) errors.title = 'Гарчиг 120 тэмдэгтээс богино байх ёстой.'

  if (!slug) errors.slug = 'Slug оруулна уу.'
  else if (!SLUG_PATTERN.test(slug)) errors.slug = 'Slug зөвхөн жижиг үсэг, тоо, зураас агуулна (жишээ: my-project).'
  else if (slug.length > 80) errors.slug = 'Slug 80 тэмдэгтээс богино байх ёстой.'

  if (!category) errors.category = 'Ангилал оруулна уу.'
  if (!PROJECT_TYPES.includes(projectType as typeof PROJECT_TYPES[number])) errors.projectType = 'Төслийн төрөл буруу байна.'
  if (!ACCENTS.includes(accent as typeof ACCENTS[number])) errors.accent = 'Өнгөний сонголт буруу байна.'

  const year = str(input, 'year')
  if (year && !/^\d{4}$/.test(year)) errors.year = '4 оронтой он оруулна уу.'

  const liveUrl = str(input, 'liveUrl')
  const githubUrl = str(input, 'githubUrl')
  const liveProblem = urlProblem(liveUrl)
  if (liveProblem) errors.liveUrl = liveProblem
  const githubProblem = urlProblem(githubUrl)
  if (githubProblem) errors.githubUrl = githubProblem

  // Image fields accept local asset paths now and R2 URLs later, without schema change.
  const images = { coverImage: 'cover_image', desktopImage: 'desktop_image', mobileImage: 'mobile_image', detailImage: 'detail_image' }
  for (const key of Object.keys(images)) {
    const problem = urlProblem(str(input, key), { allowRelative: true })
    if (problem) errors[key] = problem
  }

  // Every text field is length-checked against LIMITS. Rejecting (not truncating) keeps
  // an oversized payload from silently losing content.
  for (const [key, max] of Object.entries(LIMITS)) {
    if (errors[key]) continue
    const value = str(input, key)
    if (value.length > max) errors[key] = `Хэт урт байна (дээд тал нь ${max} тэмдэгт).`
  }

  const sortOrderRaw = input.sortOrder
  const sortOrder = Number(sortOrderRaw ?? 0)
  if (!Number.isInteger(Number(sortOrderRaw ?? 0)) && sortOrderRaw !== undefined && sortOrderRaw !== '') {
    if (!Number.isFinite(sortOrder)) errors.sortOrder = 'Дараалал бүхэл тоо байх ёстой.'
  }
  if (!errors.sortOrder && (!Number.isFinite(sortOrder) || sortOrder < 0 || sortOrder > 100000)) {
    errors.sortOrder = 'Дараалал 0–100000 хооронд байна.'
  }

  /** Parses a string list, then bounds both item count and item length. */
  const listField = (key: string) => {
    const raw = input[key]
    let items: unknown[] = []
    if (Array.isArray(raw)) items = raw
    else if (typeof raw === 'string' && raw.trim()) {
      const trimmed = raw.trim()
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed)
          if (!Array.isArray(parsed)) { errors[key] = 'Жагсаалт байх ёстой.'; return '[]' }
          items = parsed
        } catch { errors[key] = 'JSON хэлбэр буруу байна.'; return '[]' }
      } else items = trimmed.split(',').map(part => part.trim()).filter(Boolean)
    }
    if (items.length > MAX_TECH_ITEMS) { errors[key] = `Хэт олон зүйл (дээд тал нь ${MAX_TECH_ITEMS}).`; return '[]' }
    const cleaned: string[] = []
    for (const item of items) {
      if (typeof item !== 'string') { errors[key] = 'Зөвхөн текст жагсаалт байна.'; return '[]' }
      const value = item.trim()
      if (!value) continue
      if (value.length > MAX_TECH_ITEM_LEN) { errors[key] = `Нэг зүйл ${MAX_TECH_ITEM_LEN} тэмдэгтээс богино байна.`; return '[]' }
      cleaned.push(value)
    }
    return JSON.stringify(cleaned)
  }
  /**
   * Parses a list of {key?, title, text} objects. Unknown properties are dropped rather
   * than stored, so the admin cannot smuggle arbitrary structures into the database.
   */
  const objectListField = (key: string) => {
    const raw = input[key]
    let items: unknown[] = []
    if (Array.isArray(raw)) items = raw
    else if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) { errors[key] = 'Жагсаалт байх ёстой.'; return '[]' }
        items = parsed
      } catch { errors[key] = 'JSON хэлбэр буруу байна.'; return '[]' }
    }
    if (items.length > MAX_LIST_ITEMS) { errors[key] = `Хэт олон зүйл (дээд тал нь ${MAX_LIST_ITEMS}).`; return '[]' }
    const cleaned: { key?: string; title: string; text: string }[] = []
    for (const item of items) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) { errors[key] = 'Бүтэц буруу байна.'; return '[]' }
      const row = item as Record<string, unknown>
      const title = typeof row.title === 'string' ? row.title.trim() : ''
      const text = typeof row.text === 'string' ? row.text.trim() : ''
      const itemKey = typeof row.key === 'string' ? row.key.trim().slice(0, 12) : undefined
      if (title.length > MAX_ITEM_TITLE || text.length > MAX_ITEM_TEXT) {
        errors[key] = 'Жагсаалтын бичвэр хэт урт байна.'; return '[]'
      }
      if (!title && !text) continue
      cleaned.push(itemKey ? { key: itemKey, title, text } : { title, text })
    }
    return JSON.stringify(cleaned)
  }

  const techStack = listField('techStack')
  const filters = listField('filters')
  const scenes = objectListField('scenes')
  const features = objectListField('features')

  if (Object.keys(errors).length) return { ok: false, errors }

  return {
    ok: true,
    values: {
      slug, title, category, project_type: projectType, accent,
      status: str(input, 'status') || 'Concept Project',
      year,
      role: str(input, 'role'),
      headline: str(input, 'headline'),
      short_description: str(input, 'shortDescription'),
      domain: str(input, 'domain'),
      scope: str(input, 'scope'),
      tech_stack: techStack,
      filters,
      scenes,
      features,
      goal: str(input, 'goal'),
      overview: str(input, 'overview'),
      problem: str(input, 'problem'),
      solution: str(input, 'solution'),
      design_approach: str(input, 'designApproach'),
      development_details: str(input, 'developmentDetails'),
      challenges: str(input, 'challenges'),
      resolution: str(input, 'resolution'),
      result: str(input, 'result'),
      live_url: liveUrl,
      live_label: str(input, 'liveLabel') || (liveUrl ? safeHost(liveUrl) : ''),
      github_url: githubUrl,
      cover_image: str(input, 'coverImage'),
      desktop_image: str(input, 'desktopImage'),
      mobile_image: str(input, 'mobileImage'),
      detail_image: str(input, 'detailImage'),
      featured: input.featured ? 1 : 0,
      sort_order: Math.round(sortOrder),
      is_published: input.isPublished ? 1 : 0,
    },
  }
}

function safeHost(url: string): string {
  try { return new URL(url).host } catch { return '' }
}
