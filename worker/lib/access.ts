import type { Env } from './types'

/**
 * Cloudflare Access JWT verification.
 *
 * Access sits in front of the Worker and, once a visitor has signed in with the
 * configured identity provider (Google), forwards the request with a signed JWT in
 * `Cf-Access-Jwt-Assertion`. This module verifies that token end to end:
 *
 *   signature (RS256, against the team's published JWKS) → issuer → audience →
 *   expiry/not-before → verified email claim
 *
 * Nothing here trusts a header the client could set by itself. `Cf-Access-Authenticated-
 * User-Email` in particular is NOT used: it is trivially forgeable if a request ever
 * reaches the Worker without passing through Access, so the email is read only from the
 * cryptographically verified token.
 */

type JWK = { kid: string; kty: string; alg?: string; n: string; e: string; use?: string }
type AccessClaims = { iss?: string; aud?: string | string[]; exp?: number; nbf?: number; email?: string; sub?: string }

export type AccessIdentity = { email: string; subject: string }

/** Cached JWKS per team domain. Access rotates keys, so entries expire. */
const jwksCache = new Map<string, { keys: JWK[]; fetchedAt: number }>()
const JWKS_TTL_MS = 60 * 60 * 1000  // 1 hour
const CLOCK_SKEW_S = 60

export function isAccessConfigured(env: Env): boolean {
  return Boolean(env.ACCESS_TEAM_DOMAIN && env.ACCESS_AUD)
}

const b64urlToBytes = (value: string): Uint8Array => {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

const decodeJson = <T>(segment: string): T | null => {
  try { return JSON.parse(new TextDecoder().decode(b64urlToBytes(segment))) as T } catch { return null }
}

async function getKeys(env: Env): Promise<JWK[]> {
  const domain = env.ACCESS_TEAM_DOMAIN!.replace(/^https?:\/\//, '').replace(/\/$/, '')
  const cached = jwksCache.get(domain)
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.keys

  const response = await fetch(`https://${domain}/cdn-cgi/access/certs`)
  if (!response.ok) throw new Error('jwks_fetch_failed')
  const { keys } = await response.json() as { keys?: JWK[] }
  if (!Array.isArray(keys) || !keys.length) throw new Error('jwks_empty')

  jwksCache.set(domain, { keys, fetchedAt: Date.now() })
  return keys
}

/**
 * Verifies the Access JWT on a request. Returns the verified identity, or null for any
 * failure — missing, malformed, wrong issuer/audience, expired or badly signed.
 */
export async function verifyAccessJwt(request: Request, env: Env): Promise<AccessIdentity | null> {
  if (!isAccessConfigured(env)) return null

  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!token) return null

  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [headerPart, payloadPart, signaturePart] = parts

  const header = decodeJson<{ alg?: string; kid?: string }>(headerPart)
  const claims = decodeJson<AccessClaims>(payloadPart)
  if (!header || !claims) return null

  // Only RS256 is accepted; refusing "none"/HS* blocks algorithm-confusion attacks.
  if (header.alg !== 'RS256' || !header.kid) return null

  const domain = env.ACCESS_TEAM_DOMAIN!.replace(/^https?:\/\//, '').replace(/\/$/, '')
  if (claims.iss !== `https://${domain}`) return null

  const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : []
  if (!audiences.includes(env.ACCESS_AUD!)) return null

  const now = Math.floor(Date.now() / 1000)
  if (typeof claims.exp !== 'number' || claims.exp + CLOCK_SKEW_S < now) return null
  if (typeof claims.nbf === 'number' && claims.nbf - CLOCK_SKEW_S > now) return null

  let keys: JWK[]
  try { keys = await getKeys(env) } catch { return null }
  const jwk = keys.find(key => key.kid === header.kid)
  if (!jwk) return null

  let valid = false
  try {
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      b64urlToBytes(signaturePart),
      new TextEncoder().encode(`${headerPart}.${payloadPart}`),
    )
  } catch { return null }
  if (!valid) return null

  const email = (claims.email || '').trim().toLowerCase()
  if (!email) return null

  return { email, subject: claims.sub || email }
}
