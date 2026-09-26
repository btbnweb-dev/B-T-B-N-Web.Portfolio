import { isAccessConfigured, verifyAccessJwt } from './access'
import { adminEmails, isOAuthConfigured, readSession } from './oauth'
import type { Env } from './types'

export type AdminUser = {
  name: string
  role: string
  email?: string
  source: 'local-dev' | 'cloudflare-access' | 'google'
}

export type AuthResult =
  | { ok: true; user: AdminUser }
  | { ok: false; reason: 'no-identity' | 'not-allowlisted' | 'not-configured'; email?: string }

/**
 * Resolves the administrator for a request.
 *
 * Order of trust:
 *   1. Local development identity — ONLY when ENVIRONMENT=development AND
 *      LOCAL_ADMIN_DEV=true. Both come from .dev.vars, which is gitignored and never
 *      part of a deployed Worker.
 *   2. Cloudflare Access — a cryptographically verified JWT (preferred in production).
 *   3. Google OAuth session — signed, HttpOnly cookie issued by this Worker.
 *
 * A deployed Worker inherits ENVIRONMENT=production from wrangler.jsonc, so step (1)
 * can never fire there regardless of what LOCAL_ADMIN_DEV is set to. When no provider
 * is configured the result is a denial, never a fallback to the local identity.
 *
 * Whichever provider authenticates, the verified email must still appear in
 * ADMIN_EMAILS — authentication alone is not authorisation.
 */
export async function authenticate(request: Request, env: Env): Promise<AuthResult> {
  if (isDevAdminEnabled(env)) {
    return { ok: true, user: { name: 'Local Admin', role: 'Administrator', source: 'local-dev' } }
  }

  const allowed = adminEmails(env)

  // Cloudflare Access first: it is verified upstream and is the production path.
  if (isAccessConfigured(env)) {
    const identity = await verifyAccessJwt(request, env)
    if (identity) {
      if (!allowed.includes(identity.email)) return { ok: false, reason: 'not-allowlisted', email: identity.email }
      return {
        ok: true,
        user: { name: identity.email, role: 'Administrator', email: identity.email, source: 'cloudflare-access' },
      }
    }
  }

  if (isOAuthConfigured(env)) {
    const session = await readSession(env, request.headers.get('cookie'))
    if (session) {
      // readSession re-checks the allow-list, so reaching here means the email is approved.
      return {
        ok: true,
        user: { name: session.name, role: 'Administrator', email: session.email, source: 'google' },
      }
    }
  }

  if (!isAccessConfigured(env) && !isOAuthConfigured(env)) return { ok: false, reason: 'not-configured' }
  return { ok: false, reason: 'no-identity' }
}

/** Convenience wrapper for call sites that only need the user or null. */
export async function getAdminUser(request: Request, env: Env): Promise<AdminUser | null> {
  const result = await authenticate(request, env)
  return result.ok ? result.user : null
}

/** True only for a genuinely local `wrangler dev` session. */
export function isDevAdminEnabled(env: Env): boolean {
  return env.ENVIRONMENT === 'development' && env.LOCAL_ADMIN_DEV === 'true'
}

/** True when some production auth provider is available to sign in with. */
export function isAuthConfigured(env: Env): boolean {
  return isAccessConfigured(env) || isOAuthConfigured(env)
}
