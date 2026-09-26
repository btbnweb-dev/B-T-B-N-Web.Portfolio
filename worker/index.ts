import { authenticate } from './lib/auth'
import type { AdminUser } from './lib/auth'
import { handleCallback, isOAuthConfigured, logout, startLogin } from './lib/oauth'
import { MAX_BODY_BYTES, toDTO, validateProject } from './lib/projects'
import {
  audit, clientKey, coarseIp, json, methodNotAllowed, originAllowed, rateLimit, withSecurityHeaders,
} from './lib/security'
import type { Env, ProjectRow } from './lib/types'

const COLUMNS = `id, slug, title, category, project_type, status, year, role, headline,
  short_description, domain, scope, accent, tech_stack, filters, scenes, features,
  goal, overview, problem, solution, design_approach, development_details, challenges,
  resolution, result, live_url, live_label, github_url, cover_image, desktop_image,
  mobile_image, detail_image, featured, sort_order, is_published, created_at, updated_at`

/**
 * Columns an admin write may target. Validation already returns a fixed key set, but
 * pinning it here means a future edit to the validator cannot widen what reaches SQL.
 */
const WRITABLE = new Set([
  'slug', 'title', 'category', 'project_type', 'accent', 'status', 'year', 'role', 'headline',
  'short_description', 'domain', 'scope', 'tech_stack', 'filters', 'scenes', 'features',
  'goal', 'overview', 'problem', 'solution', 'design_approach', 'development_details',
  'challenges', 'resolution', 'result', 'live_url', 'live_label', 'github_url',
  'cover_image', 'desktop_image', 'mobile_image', 'detail_image',
  'featured', 'sort_order', 'is_published',
])
const assertWritable = (keys: string[]) => {
  for (const key of keys) if (!WRITABLE.has(key)) throw new Error('unexpected_column')
}

// Admin work is bursty: opening the list, toggling publish and reordering each fire
// several requests, so the ceiling is set well above normal use and only catches
// scripted abuse. Sign-in is deliberately much tighter — it is the credential-guessing
// surface, and a human never needs more than a handful of attempts per minute.
const ADMIN_RATE = { limit: 300, windowMs: 60_000 }
const AUTH_RATE = { limit: 10, windowMs: 60_000 }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const { pathname } = url
    const isPrivate = pathname.startsWith('/api/') || pathname === '/admin' || pathname.startsWith('/admin/')
    try {
      return withSecurityHeaders(await route(request, env, url), env, { private: isPrivate })
    } catch (error) {
      // Internal detail is logged, never returned to the client.
      console.error('unhandled', { path: pathname, message: error instanceof Error ? error.message : 'unknown' })
      return withSecurityHeaders(json({ error: 'Дотоод алдаа гарлаа.' }, 500), env, { private: true })
    }
  },
} satisfies ExportedHandler<Env>

async function route(request: Request, env: Env, url: URL): Promise<Response> {
  const { pathname } = url

  // ---- Sign-in endpoints (public by definition) ----
  if (pathname.startsWith('/api/auth/')) {
    const ip = clientKey(request)
    const limited = rateLimit('auth:' + ip, AUTH_RATE.limit, AUTH_RATE.windowMs)
    if (!limited.ok) {
      audit('admin.ratelimited', { scope: 'auth', ip: coarseIp(ip) })
      return json({ error: 'Хэт олон оролдлого. Түр хүлээнэ үү.' }, 429, { 'retry-after': String(limited.retryAfter) })
    }
    if (pathname === '/api/auth/login') {
      return request.method === 'GET' ? startLogin(env, url) : methodNotAllowed(['GET'])
    }
    if (pathname === '/api/auth/callback/google') {
      return request.method === 'GET' ? handleCallback(request, env, url) : methodNotAllowed(['GET'])
    }
    if (pathname === '/api/auth/logout') {
      if (request.method !== 'GET' && request.method !== 'POST') return methodNotAllowed(['GET', 'POST'])
      return logout(url)
    }
    return json({ error: 'Ийм API байхгүй.' }, 404)
  }

  if (pathname.startsWith('/api/')) return handleApi(request, env, url)

  // ---- Admin UI ----
  // With OAuth configured, the shell can show the existing sign-in UI. AdminApp
  // renders the dashboard only after the independently protected session API succeeds.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    const auth = await authenticate(request, env)
    if (!auth.ok) {
      if (auth.reason === 'not-allowlisted') {
        audit('admin.auth.denied', { reason: 'not-allowlisted', email: auth.email, ip: coarseIp(clientKey(request)) })
      }
      if (isOAuthConfigured(env)) return env.ASSETS.fetch(request)
      return new Response(adminDeniedPage(), { status: 403, headers: { 'content-type': 'text/html; charset=utf-8' } })
    }
  }

  return env.ASSETS.fetch(request)
}

async function handleApi(request: Request, env: Env, url: URL): Promise<Response> {
  const { pathname } = url
  const method = request.method

  // ---- Public reads (published projects only) ----
  if (pathname === '/api/projects') {
    if (method !== 'GET' && method !== 'HEAD') return methodNotAllowed(['GET'])
    const { results } = await env.DB
      .prepare(`SELECT ${COLUMNS} FROM projects WHERE is_published = 1 ORDER BY sort_order ASC, id ASC`)
      .all<ProjectRow>()
    return json({ projects: results.map(toDTO) })
  }

  const publicMatch = pathname.match(/^\/api\/projects\/([a-z0-9-]{1,80})$/)
  if (publicMatch) {
    if (method !== 'GET' && method !== 'HEAD') return methodNotAllowed(['GET'])
    const row = await env.DB
      .prepare(`SELECT ${COLUMNS} FROM projects WHERE slug = ?1 AND is_published = 1`)
      .bind(publicMatch[1]).first<ProjectRow>()
    // Unpublished and missing are indistinguishable, so drafts do not leak by probing.
    if (!row) return json({ error: 'Төсөл олдсонгүй.' }, 404)
    return json({ project: toDTO(row) })
  }

  if (pathname.startsWith('/api/admin/')) return handleAdminApi(request, env, url)

  return json({ error: 'Ийм API байхгүй.' }, 404)
}

async function handleAdminApi(request: Request, env: Env, url: URL): Promise<Response> {
  const { pathname } = url
  const method = request.method
  const ip = clientKey(request)

  // 1. Rate limit before doing any work.
  const limited = rateLimit('admin:' + ip, ADMIN_RATE.limit, ADMIN_RATE.windowMs)
  if (!limited.ok) {
    audit('admin.ratelimited', { scope: 'admin-api', ip: coarseIp(ip) })
    return json({ error: 'Хэт олон хүсэлт. Түр хүлээнэ үү.' }, 429, { 'retry-after': String(limited.retryAfter) })
  }

  // 2. Reject cross-site writes before authenticating (CSRF defence).
  if (!originAllowed(request, url)) {
    audit('admin.origin_rejected', { method, path: pathname, ip: coarseIp(ip) })
    return json({ error: 'Хүсэлтийн эх сурвалж зөвшөөрөгдөөгүй.' }, 403)
  }

  // 3. Every admin endpoint verifies authorisation independently.
  const auth = await authenticate(request, env)
  if (!auth.ok) {
    audit('admin.auth.denied', { reason: auth.reason, email: auth.email, path: pathname, ip: coarseIp(ip) })
    const notAllowed = auth.reason === 'not-allowlisted'
    return json(
      { error: notAllowed ? 'Энэ хаягт админ эрх олгоогүй байна.' : 'Нэвтрэх шаардлагатай.' },
      notAllowed ? 403 : 401,
    )
  }
  const user = auth.user

  if (pathname === '/api/admin/session') {
    if (method !== 'GET') return methodNotAllowed(['GET'])
    return json({ user })
  }

  if (pathname === '/api/admin/projects') {
    if (method === 'GET') return listProjects(env)
    if (method === 'POST') return createProject(request, env, user)
    return methodNotAllowed(['GET', 'POST'])
  }

  const idMatch = pathname.match(/^\/api\/admin\/projects\/(\d{1,12})$/)
  if (idMatch) {
    // Bounded digits only, then parsed as an integer — an id cannot carry SQL or
    // address an unintended row.
    const id = Number(idMatch[1])
    if (!Number.isSafeInteger(id) || id <= 0) return json({ error: 'Төсөл олдсонгүй.' }, 404)

    if (method === 'GET') return getProject(env, id)
    if (method === 'PUT') return updateProject(request, env, id, user)
    if (method === 'PATCH') return patchProject(request, env, id, user)
    if (method === 'DELETE') return deleteProject(env, id, user)
    return methodNotAllowed(['GET', 'PUT', 'PATCH', 'DELETE'])
  }

  return json({ error: 'Ийм API байхгүй.' }, 404)
}

// ---------------------------------------------------------------- handlers

async function listProjects(env: Env): Promise<Response> {
  const { results } = await env.DB
    .prepare(`SELECT ${COLUMNS} FROM projects ORDER BY sort_order ASC, id ASC`)
    .all<ProjectRow>()
  const projects = results.map(toDTO)
  return json({
    projects,
    stats: {
      total: projects.length,
      published: projects.filter(p => p.isPublished).length,
      production: projects.filter(p => p.project_type === 'production').length,
      concept: projects.filter(p => p.project_type === 'concept').length,
      featured: projects.filter(p => p.featured).length,
      recentlyUpdated: [...projects]
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
        .slice(0, 5)
        .map(p => ({ id: p.id, slug: p.slug, title: p.title, updated_at: p.updated_at })),
    },
  })
}

async function getProject(env: Env, id: number): Promise<Response> {
  const row = await env.DB.prepare(`SELECT ${COLUMNS} FROM projects WHERE id = ?1`).bind(id).first<ProjectRow>()
  if (!row) return json({ error: 'Төсөл олдсонгүй.' }, 404)
  return json({ project: toDTO(row) })
}

async function createProject(request: Request, env: Env, user: AdminUser): Promise<Response> {
  const body = await readJson(request)
  if (!body.ok) return body.response
  const validated = validateProject(body.value)
  if (!validated.ok) return json({ errors: validated.errors }, 422)

  const exists = await env.DB.prepare('SELECT id FROM projects WHERE slug = ?1').bind(validated.values.slug).first()
  if (exists) return json({ errors: { slug: 'Энэ slug аль хэдийн ашиглагдсан байна.' } }, 409)

  const keys = Object.keys(validated.values)
  assertWritable(keys)
  const placeholders = keys.map((_, i) => '?' + (i + 1)).join(', ')
  const row = await env.DB
    .prepare(`INSERT INTO projects (${keys.join(', ')}) VALUES (${placeholders}) RETURNING ${COLUMNS}`)
    .bind(...keys.map(k => validated.values[k])).first<ProjectRow>()

  audit('project.created', { by: user.email || user.source, slug: String(validated.values.slug), id: row?.id })
  return json({ project: row ? toDTO(row) : null }, 201)
}

async function updateProject(request: Request, env: Env, id: number, user: AdminUser): Promise<Response> {
  const body = await readJson(request)
  if (!body.ok) return body.response
  const validated = validateProject(body.value)
  if (!validated.ok) return json({ errors: validated.errors }, 422)

  const clash = await env.DB.prepare('SELECT id FROM projects WHERE slug = ?1 AND id != ?2')
    .bind(validated.values.slug, id).first()
  if (clash) return json({ errors: { slug: 'Энэ slug аль хэдийн ашиглагдсан байна.' } }, 409)

  const keys = Object.keys(validated.values)
  assertWritable(keys)
  const assignments = keys.map((k, i) => `${k} = ?${i + 1}`).join(', ')
  const row = await env.DB
    .prepare(`UPDATE projects SET ${assignments} WHERE id = ?${keys.length + 1} RETURNING ${COLUMNS}`)
    .bind(...keys.map(k => validated.values[k]), id).first<ProjectRow>()
  if (!row) return json({ error: 'Төсөл олдсонгүй.' }, 404)

  audit('project.updated', { by: user.email || user.source, slug: row.slug, id })
  return json({ project: toDTO(row) })
}

async function patchProject(request: Request, env: Env, id: number, user: AdminUser): Promise<Response> {
  const body = await readJson(request)
  if (!body.ok) return body.response
  const input = body.value

  const sets: string[] = []
  const binds: (string | number)[] = []
  let publishChange: boolean | undefined

  if ('isPublished' in input) {
    if (typeof input.isPublished !== 'boolean') return json({ errors: { isPublished: 'true эсвэл false байх ёстой.' } }, 422)
    publishChange = input.isPublished
    sets.push('is_published = ?' + (binds.length + 1)); binds.push(input.isPublished ? 1 : 0)
  }
  if ('featured' in input) {
    if (typeof input.featured !== 'boolean') return json({ errors: { featured: 'true эсвэл false байх ёстой.' } }, 422)
    sets.push('featured = ?' + (binds.length + 1)); binds.push(input.featured ? 1 : 0)
  }
  if ('sortOrder' in input) {
    const order = Number(input.sortOrder)
    if (!Number.isFinite(order) || order < 0 || order > 100000) {
      return json({ errors: { sortOrder: 'Дараалал 0–100000 хооронд байна.' } }, 422)
    }
    sets.push('sort_order = ?' + (binds.length + 1)); binds.push(Math.round(order))
  }
  if (!sets.length) return json({ error: 'Өөрчлөх талбар алга.' }, 400)

  const row = await env.DB
    .prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?${binds.length + 1} RETURNING ${COLUMNS}`)
    .bind(...binds, id).first<ProjectRow>()
  if (!row) return json({ error: 'Төсөл олдсонгүй.' }, 404)

  if (publishChange !== undefined) {
    audit(publishChange ? 'project.published' : 'project.unpublished', { by: user.email || user.source, slug: row.slug, id })
  } else {
    audit('project.updated', { by: user.email || user.source, slug: row.slug, id })
  }
  return json({ project: toDTO(row) })
}

async function deleteProject(env: Env, id: number, user: AdminUser): Promise<Response> {
  const row = await env.DB.prepare('DELETE FROM projects WHERE id = ?1 RETURNING id, slug')
    .bind(id).first<{ id: number; slug: string }>()
  if (!row) return json({ error: 'Төсөл олдсонгүй.' }, 404)
  audit('project.deleted', { by: user.email || user.source, slug: row.slug, id })
  return json({ deleted: id })
}

// ---------------------------------------------------------------- helpers

type BodyResult = { ok: true; value: Record<string, unknown> } | { ok: false; response: Response }

/** Reads a JSON object body, enforcing content type and a size ceiling. */
async function readJson(request: Request): Promise<BodyResult> {
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return { ok: false, response: json({ error: 'Content-Type нь application/json байх ёстой.' }, 415) }
  }
  const declared = Number(request.headers.get('content-length') || '0')
  if (declared > MAX_BODY_BYTES) {
    return { ok: false, response: json({ error: 'Хүсэлт хэт том байна.' }, 413) }
  }

  const raw = await request.text()
  // Re-check after reading: content-length can be absent or untrue.
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
    return { ok: false, response: json({ error: 'Хүсэлт хэт том байна.' }, 413) }
  }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, response: json({ error: 'Хүсэлтийн бие буруу байна.' }, 400) }
    }
    return { ok: true, value: parsed as Record<string, unknown> }
  } catch {
    return { ok: false, response: json({ error: 'Хүсэлтийн бие буруу байна.' }, 400) }
  }
}

function adminDeniedPage(): string {
  return `<!doctype html><html lang="mn"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Хандах эрхгүй — B-T-B-N Web</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0e0b;color:#e8eae3;
font:16px/1.7 system-ui,sans-serif;padding:24px}main{max-width:44ch}h1{font-size:28px;margin:0 0 16px}
p{color:#8e9686;margin:0 0 12px}a{color:#cdf87a}</style>
</head><body><main><h1>Хандах эрхгүй</h1>
<p>Админ хэсэг хамгаалалттай. Зөвшөөрөгдсөн Google хаягаар нэвтэрнэ үү.</p>
<p><a href="/">← Нүүр хуудас</a></p></main></body></html>`
}
