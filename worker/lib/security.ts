import type { Env } from './types'

/** Public error text. Internal detail is logged, never returned. */
export const json = (data: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  })

export const methodNotAllowed = (allowed: string[]) =>
  json({ error: 'Энэ хаяг дээр тухайн үйлдэл дэмжигдэхгүй.' }, 405, { allow: allowed.join(', ') })

// ---------------------------------------------------------------- headers

/**
 * Content Security Policy for the real portfolio.
 *
 * - `frame-ancestors 'none'` blocks clickjacking and replaces X-Frame-Options.
 * - Styles need 'unsafe-inline': React sets inline style attributes (e.g. animation
 *   delays on the hero mark) and Tailwind injects a style element in dev.
 * - Scripts do NOT allow 'unsafe-inline' or 'unsafe-eval' in production. The dev server
 *   needs both for HMR, so they are added only when ENVIRONMENT=development.
 * - connect-src allows Formspree because the contact form posts there from the browser.
 */
export function contentSecurityPolicy(env: Env): string {
  const dev = env.ENVIRONMENT === 'development'
  const script = dev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self'"
  const connect = dev
    ? "'self' https://formspree.io ws: wss: http://localhost:* http://127.0.0.1:*"
    : "'self' https://formspree.io"
  return [
    "default-src 'self'",
    `script-src ${script}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src ${connect}`,
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
}

/** Applies security headers to any response, preserving its body and status. */
export function withSecurityHeaders(response: Response, env: Env, opts: { private?: boolean } = {}): Response {
  const headers = new Headers(response.headers)
  headers.set('content-security-policy', contentSecurityPolicy(env))
  headers.set('x-content-type-options', 'nosniff')
  headers.set('referrer-policy', 'strict-origin-when-cross-origin')
  headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()')
  headers.set('cross-origin-opener-policy', 'same-origin')
  headers.set('x-frame-options', 'DENY')   // belt-and-braces for very old agents

  // HSTS only makes sense over HTTPS; sending it from http://localhost would poison
  // the developer's browser for every other localhost project.
  if (env.ENVIRONMENT !== 'development') {
    headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains')
  }
  if (opts.private) headers.set('cache-control', 'no-store, private')

  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

// ---------------------------------------------------------------- origin / CSRF

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Rejects cross-site state changes.
 *
 * The admin is same-origin, so a state-changing request must carry an Origin (or
 * Referer) matching the Worker's own origin. Browsers always send Origin on
 * cross-origin writes, so this blocks classic CSRF without relying on CORS — which
 * only restricts *reading* responses, not sending requests.
 */
export function originAllowed(request: Request, url: URL): boolean {
  if (SAFE_METHODS.has(request.method)) return true

  const origin = request.headers.get('origin')
  // An Origin that does not match is always a cross-site write: refuse outright.
  if (origin) return origin === url.origin

  const referer = request.headers.get('referer')
  if (referer) {
    try { return new URL(referer).origin === url.origin } catch { return false }
  }

  // Neither header present. This is never a cross-site *browser* form post — browsers
  // always attach Origin to those — but it is the normal shape of a CLI/CI client. Such
  // callers must prove intent with a custom header, which a cross-site page cannot add
  // without triggering a CORS preflight that this Worker never approves.
  return request.headers.get('x-requested-with') === 'btbn-admin'
}

// ---------------------------------------------------------------- rate limiting

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

/**
 * In-memory fixed-window limiter.
 *
 * NOTE ON SCOPE: this lives in one Worker isolate, so it throttles a burst from a single
 * client hitting one edge location. It is a speed bump, not a distributed guarantee —
 * an attacker spread across many colos would get a higher effective limit. Real
 * enforcement belongs in Cloudflare's own rate limiting rules, which are documented in
 * the production checklist. Treat this as defence in depth, not the primary control.
 */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 5000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k)
    return { ok: true, retryAfter: 0 }
  }
  bucket.count++
  if (bucket.count > limit) return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) }
  return { ok: true, retryAfter: 0 }
}

export const clientKey = (request: Request): string =>
  request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

// ---------------------------------------------------------------- audit log

type AuditEvent =
  | 'admin.auth.success' | 'admin.auth.denied' | 'admin.ratelimited' | 'admin.origin_rejected'
  | 'project.created' | 'project.updated' | 'project.deleted' | 'project.published' | 'project.unpublished'

/**
 * Structured audit logging. Deliberately records only non-sensitive metadata: never a
 * JWT, cookie, secret or form body. Emails identify who acted and are intentionally
 * included; IPs are truncated to avoid storing a full address.
 */
export function audit(event: AuditEvent, details: Record<string, string | number | boolean | undefined> = {}) {
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(details)) if (v !== undefined && v !== '') clean[k] = v
  console.log(JSON.stringify({ at: new Date().toISOString(), event, ...clean }))
}

/** Reduces an IP to a coarse prefix so logs stay useful without storing full addresses. */
export function coarseIp(ip: string): string {
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + '::/48'
  const parts = ip.split('.')
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.${parts[2]}.0/24` : 'unknown'
}
