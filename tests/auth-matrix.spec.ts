import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

/**
 * Authentication/authorisation decision table.
 *
 * These cases cannot be produced over HTTP against the local dev server, because that
 * session deliberately runs with the local admin identity enabled. So the worker modules
 * are transpiled and driven directly, letting every environment combination be asserted —
 * including the ones that must never grant access in production.
 */

const require = createRequire(import.meta.url)
const ts = require('typescript')
const libDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'worker', 'lib')

/** Transpiles a worker module (and its relative imports) into a runnable data: URL. */
function compile(name: string, seen = new Map<string, string>()): string {
  if (seen.has(name)) return seen.get(name)!
  const source = readFileSync(join(libDir, name + '.ts'), 'utf8')
  let js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  for (const match of [...js.matchAll(/from ['"]\.\/(\w[\w-]*)['"]/g)]) {
    js = js.replaceAll(`'./${match[1]}'`, `'${compile(match[1], seen)}'`).replaceAll(`"./${match[1]}"`, `"${compile(match[1], seen)}"`)
  }
  const url = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
  seen.set(name, url)
  return url
}

const authModule = await import(compile('auth'))
const oauthModule = await import(compile('oauth'))
const accessModule = await import(compile('access'))

const SECRET = 'test-session-secret-'.padEnd(48, 'x')
const OAUTH_ENV = {
  GOOGLE_CLIENT_ID: 'client-id',
  GOOGLE_CLIENT_SECRET: 'client-secret',
  SESSION_SECRET: SECRET,
  ADMIN_EMAILS: 'owner@example.com,second@example.com',
}
const ACCESS_ENV = {
  ACCESS_TEAM_DOMAIN: 'example.cloudflareaccess.com',
  ACCESS_AUD: 'aud-tag-value',
  ADMIN_EMAILS: 'owner@example.com',
}

const req = (headers: Record<string, string> = {}) => new Request('https://portfolio.example/admin', { headers })

// --- helpers to mint a genuine session cookie -------------------------------
const encoder = new TextEncoder()
const b64url = (bytes: Uint8Array | ArrayBuffer) =>
  Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
    .toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64url(await crypto.subtle.sign('HMAC', key, encoder.encode(data)))
}
async function sessionCookie(email: string, { ttl = 3600, secret = SECRET } = {}) {
  const body = b64url(encoder.encode(JSON.stringify({ email, name: email, exp: Math.floor(Date.now() / 1000) + ttl })))
  return `btbn_admin=${body}.${await hmac(secret, body)}`
}

test.describe('local development bypass', () => {
  test('grants access only when BOTH flags are set', async () => {
    const granted = await authModule.authenticate(req(), { ENVIRONMENT: 'development', LOCAL_ADMIN_DEV: 'true' })
    expect(granted.ok).toBe(true)
    expect(granted.user.source).toBe('local-dev')
  })

  test('production NEVER falls back to the local identity', async () => {
    // The flag is set to every truthy spelling an operator might try; production must
    // ignore all of them because ENVIRONMENT is not "development".
    for (const flag of ['true', 'TRUE', 'True', '1', 'yes']) {
      const result = await authModule.authenticate(req(), { ...OAUTH_ENV, ENVIRONMENT: 'production', LOCAL_ADMIN_DEV: flag })
      expect(result.ok, `LOCAL_ADMIN_DEV=${flag}`).toBe(false)
    }
  })

  test('a missing ENVIRONMENT is not treated as development', async () => {
    expect((await authModule.authenticate(req(), { LOCAL_ADMIN_DEV: 'true' })).ok).toBe(false)
    expect((await authModule.authenticate(req(), { ENVIRONMENT: '', LOCAL_ADMIN_DEV: 'true' })).ok).toBe(false)
  })

  test('development without the flag is denied', async () => {
    expect((await authModule.authenticate(req(), { ENVIRONMENT: 'development' })).ok).toBe(false)
    expect((await authModule.authenticate(req(), { ENVIRONMENT: 'development', LOCAL_ADMIN_DEV: 'false' })).ok).toBe(false)
  })

  test('with no provider configured, production denies rather than degrades', async () => {
    const result = await authModule.authenticate(req(), { ENVIRONMENT: 'production' })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('not-configured')
  })
})

test.describe('Google session authorisation', () => {
  const env = { ...OAUTH_ENV, ENVIRONMENT: 'production' }

  test('an allow-listed account with a valid session is admitted', async () => {
    const result = await authModule.authenticate(req({ cookie: await sessionCookie('owner@example.com') }), env)
    expect(result.ok).toBe(true)
    expect(result.user.email).toBe('owner@example.com')
  })

  test('a correctly signed session for a NON-allow-listed account is refused', async () => {
    const result = await authModule.authenticate(req({ cookie: await sessionCookie('stranger@example.com') }), env)
    expect(result.ok).toBe(false)
  })

  test('forged, expired and wrongly-signed cookies are refused', async () => {
    const cases: [string, string][] = [
      ['forged', 'btbn_admin=notarealtoken'],
      ['tampered payload', 'btbn_admin=eyJlbWFpbCI6Im93bmVyQGV4YW1wbGUuY29tIn0.badsig'],
      ['expired', await sessionCookie('owner@example.com', { ttl: -60 })],
      ['wrong secret', await sessionCookie('owner@example.com', { secret: 'a-different-secret-value-entirely' })],
    ]
    for (const [name, cookie] of cases) {
      expect((await authModule.authenticate(req({ cookie }), env)).ok, name).toBe(false)
    }
  })

  test('removing an address from the allow-list revokes an existing session', async () => {
    const cookie = await sessionCookie('owner@example.com')
    expect((await authModule.authenticate(req({ cookie }), env)).ok).toBe(true)
    const revoked = { ...env, ADMIN_EMAILS: 'someone.else@example.com' }
    expect((await authModule.authenticate(req({ cookie }), revoked)).ok).toBe(false)
  })

  test('the allow-list is trimmed and case-insensitive', async () => {
    const emails = oauthModule.adminEmails({ ADMIN_EMAILS: '  Owner@Example.COM , second@example.com  ' })
    expect(emails).toEqual(['owner@example.com', 'second@example.com'])
    // An address differing only by case still matches.
    const result = await authModule.authenticate(req({ cookie: await sessionCookie('owner@example.com') }), env)
    expect(result.ok).toBe(true)
  })

  test('an empty allow-list admits nobody', async () => {
    const env0 = { ...OAUTH_ENV, ADMIN_EMAILS: '', ENVIRONMENT: 'production' }
    expect(oauthModule.isOAuthConfigured(env0)).toBe(false)
    expect((await authModule.authenticate(req({ cookie: await sessionCookie('owner@example.com') }), env0)).ok).toBe(false)
  })
})

test.describe('Cloudflare Access JWT verification', () => {
  const env = { ...ACCESS_ENV, ENVIRONMENT: 'production' }

  test('a missing or malformed token is refused', async () => {
    expect(await accessModule.verifyAccessJwt(req(), env)).toBeNull()
    for (const token of ['', 'not-a-jwt', 'a.b', 'a.b.c.d', 'x.y.z']) {
      expect(await accessModule.verifyAccessJwt(req({ 'cf-access-jwt-assertion': token }), env), token).toBeNull()
    }
  })

  test('an unsigned ("alg: none") token is refused', async () => {
    const header = b64url(encoder.encode(JSON.stringify({ alg: 'none', kid: 'k1' })))
    const payload = b64url(encoder.encode(JSON.stringify({
      iss: 'https://example.cloudflareaccess.com', aud: 'aud-tag-value',
      exp: Math.floor(Date.now() / 1000) + 600, email: 'owner@example.com',
    })))
    const token = `${header}.${payload}.`
    expect(await accessModule.verifyAccessJwt(req({ 'cf-access-jwt-assertion': token }), env)).toBeNull()
  })

  test('an HS256 token signed with a guessable key is refused', async () => {
    // Algorithm-confusion attempt: only RS256 is accepted.
    const header = b64url(encoder.encode(JSON.stringify({ alg: 'HS256', kid: 'k1' })))
    const payload = b64url(encoder.encode(JSON.stringify({
      iss: 'https://example.cloudflareaccess.com', aud: 'aud-tag-value',
      exp: Math.floor(Date.now() / 1000) + 600, email: 'owner@example.com',
    })))
    const token = `${header}.${payload}.${await hmac('public-key-as-hmac-secret', `${header}.${payload}`)}`
    expect(await accessModule.verifyAccessJwt(req({ 'cf-access-jwt-assertion': token }), env)).toBeNull()
  })

  test('Access is inert until both bindings are configured', async () => {
    expect(accessModule.isAccessConfigured({})).toBe(false)
    expect(accessModule.isAccessConfigured({ ACCESS_TEAM_DOMAIN: 'x.cloudflareaccess.com' })).toBe(false)
    expect(accessModule.isAccessConfigured({ ACCESS_AUD: 'aud' })).toBe(false)
    expect(accessModule.isAccessConfigured(ACCESS_ENV)).toBe(true)
  })

  test('a forged identity header alone grants nothing', async () => {
    // Cf-Access-Authenticated-User-Email is trivially spoofable, so it must be ignored.
    const spoofed = req({ 'cf-access-authenticated-user-email': 'owner@example.com' })
    expect(await accessModule.verifyAccessJwt(spoofed, env)).toBeNull()
    expect((await authModule.authenticate(spoofed, env)).ok).toBe(false)
  })
})
