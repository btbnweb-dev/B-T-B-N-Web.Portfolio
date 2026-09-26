import type { Env } from './types'

/**
 * Google OAuth 2.0 sign-in for the admin surface.
 *
 * Flow: /api/auth/login → Google consent → /api/auth/callback/google → signed session
 * cookie → /admin. Only addresses listed in ADMIN_EMAILS may sign in; everyone else is
 * rejected after Google confirms who they are.
 *
 * The client secret is only ever read from env (a Wrangler secret in production,
 * .dev.vars locally). It is never sent to the browser and never logged.
 */

const GOOGLE_AUTH = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO = 'https://www.googleapis.com/oauth2/v3/userinfo'

export const SESSION_COOKIE = 'btbn_admin'
const STATE_COOKIE = 'btbn_oauth_state'
const SESSION_MAX_AGE = 60 * 60 * 8       // 8 hours
const STATE_MAX_AGE = 60 * 10             // 10 minutes

/** Addresses allowed into the admin, from ADMIN_EMAILS (comma separated). */
export function adminEmails(env: Env): string[] {
  return (env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isOAuthConfigured(env: Env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.SESSION_SECRET && adminEmails(env).length)
}

// ---------- crypto helpers ----------

const encoder = new TextEncoder()

const b64url = (bytes: ArrayBuffer | Uint8Array): string => {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (const byte of view) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(await crypto.subtle.sign('HMAC', key, encoder.encode(data)))
}

/** Constant-time comparison so a wrong signature cannot be probed byte by byte. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// ---------- session cookie ----------

type SessionPayload = { email: string; name: string; exp: number }

async function signSession(env: Env, payload: SessionPayload): Promise<string> {
  const body = b64url(encoder.encode(JSON.stringify(payload)))
  return body + '.' + await hmac(env.SESSION_SECRET!, body)
}

export async function readSession(env: Env, cookieHeader: string | null): Promise<SessionPayload | null> {
  const raw = getCookie(cookieHeader, SESSION_COOKIE)
  if (!raw) return null
  const [body, signature] = raw.split('.')
  if (!body || !signature) return null
  if (!safeEqual(signature, await hmac(env.SESSION_SECRET!, body))) return null
  try {
    const payload = JSON.parse(atob(body.replaceAll('-', '+').replaceAll('_', '/'))) as SessionPayload
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    // The allow-list is re-checked on every request, so removing an address from
    // ADMIN_EMAILS revokes access immediately rather than at cookie expiry.
    if (!adminEmails(env).includes(payload.email.toLowerCase())) return null
    return payload
  } catch { return null }
}

function getCookie(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}

const cookie = (name: string, value: string, maxAge: number, secure: boolean) =>
  `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}` + (secure ? '; Secure' : '')

// ---------- flow handlers ----------

const isSecure = (url: URL) => url.protocol === 'https:'

/** Step 1 — redirect to Google with a signed state value guarding against CSRF. */
export async function startLogin(env: Env, url: URL): Promise<Response> {
  if (!isOAuthConfigured(env)) {
    return new Response('OAuth тохируулаагүй байна.', { status: 503 })
  }
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(16)))
  const state = nonce + '.' + await hmac(env.SESSION_SECRET!, nonce)
  const redirectUri = url.origin + '/api/auth/callback/google'

  const authorize = new URL(GOOGLE_AUTH)
  authorize.searchParams.set('client_id', env.GOOGLE_CLIENT_ID!)
  authorize.searchParams.set('redirect_uri', redirectUri)
  authorize.searchParams.set('response_type', 'code')
  authorize.searchParams.set('scope', 'openid email profile')
  authorize.searchParams.set('state', state)
  authorize.searchParams.set('prompt', 'select_account')

  return new Response(null, {
    status: 302,
    headers: {
      location: authorize.toString(),
      'set-cookie': cookie(STATE_COOKIE, state, STATE_MAX_AGE, isSecure(url)),
    },
  })
}

/** Step 2 — exchange the code, verify the account, issue the session. */
export async function handleCallback(request: Request, env: Env, url: URL): Promise<Response> {
  if (!isOAuthConfigured(env)) return new Response('OAuth тохируулаагүй байна.', { status: 503 })

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const expected = getCookie(request.headers.get('cookie'), STATE_COOKIE)

  if (!code || !state || !expected || !safeEqual(state, expected)) {
    return denied('Нэвтрэх хүсэлт хүчингүй байна. Дахин оролдоно уу.', url)
  }
  const [nonce, signature] = state.split('.')
  if (!nonce || !signature || !safeEqual(signature, await hmac(env.SESSION_SECRET!, nonce))) {
    return denied('Нэвтрэх хүсэлт хүчингүй байна. Дахин оролдоно уу.', url)
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: url.origin + '/api/auth/callback/google',
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenResponse.ok) return denied('Google-тэй холбогдож чадсангүй.', url)
  const { access_token } = await tokenResponse.json() as { access_token?: string }
  if (!access_token) return denied('Google-ээс token авч чадсангүй.', url)

  const profileResponse = await fetch(GOOGLE_USERINFO, { headers: { authorization: 'Bearer ' + access_token } })
  if (!profileResponse.ok) return denied('Хэрэглэгчийн мэдээлэл авч чадсангүй.', url)
  const profile = await profileResponse.json() as { email?: string; email_verified?: boolean; name?: string }

  const email = (profile.email || '').toLowerCase()
  if (!email || profile.email_verified === false) return denied('Google хаяг баталгаажаагүй байна.', url)
  if (!adminEmails(env).includes(email)) {
    return denied(`${email} хаягт админ эрх олгоогүй байна.`, url, 403)
  }

  const session = await signSession(env, {
    email,
    name: profile.name || email,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  })

  return new Response(null, {
    status: 302,
    headers: [
      ['location', '/admin'],
      ['set-cookie', cookie(SESSION_COOKIE, session, SESSION_MAX_AGE, isSecure(url))],
      ['set-cookie', cookie(STATE_COOKIE, '', 0, isSecure(url))],
    ],
  })
}

export function logout(url: URL): Response {
  return new Response(null, {
    status: 302,
    headers: { location: '/', 'set-cookie': cookie(SESSION_COOKIE, '', 0, isSecure(url)) },
  })
}

function denied(message: string, url: URL, status = 401): Response {
  return new Response(page(message), {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'set-cookie': cookie(STATE_COOKIE, '', 0, isSecure(url)) },
  })
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

function page(message: string): string {
  return `<!doctype html><html lang="mn"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Нэвтрэх — B-T-B-N Web</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0c0e0b;color:#e8eae3;
font:16px/1.7 system-ui,sans-serif;padding:24px}main{max-width:44ch;text-align:center}h1{font-size:26px;margin:0 0 16px}
p{color:#8e9686;margin:0 0 20px}a{color:#cdf87a}</style></head><body><main>
<h1>Нэвтрэх амжилтгүй</h1><p>${escapeHtml(message)}</p>
<p><a href="/api/auth/login">← Дахин оролдох</a> · <a href="/">Нүүр хуудас</a></p></main></body></html>`
}
