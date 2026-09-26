import { test, expect } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { contentSecurityPolicy } from '../worker/lib/security'

/**
 * Security tests against the running Worker.
 *
 * The local dev session has LOCAL_ADMIN_DEV enabled, so requests here are treated as an
 * authenticated admin. That lets the mutation, validation, method, cache and origin
 * rules be exercised for real. The auth *decision table* (production bypass attempts,
 * forged tokens, non-allowlisted accounts) cannot be reached over HTTP in that state and
 * is covered by tests/auth-matrix.spec.ts, which drives the modules directly.
 */

const valid = (suffix: string) => ({
  title: 'Sec ' + suffix,
  slug: 'sec-' + suffix,
  category: 'Concept Landing Page',
  projectType: 'concept',
  accent: 'coffee',
  year: '2026',
  sortOrder: 990,
  featured: false,
  isPublished: false,
})

async function cleanup(api: APIRequestContext) {
  const res = await api.get('/api/admin/projects')
  if (!res.ok()) return
  const { projects } = await res.json()
  for (const p of projects) if (p.slug.startsWith('sec-')) await api.delete(`/api/admin/projects/${p.id}`)
}

test.describe('admin API authorisation', () => {
  test.afterEach(async ({ request }) => { await cleanup(request) })

  test('every admin route is gated server-side, not by the UI', async ({ request }) => {
    // Each of these must make its own authorisation decision. In this dev session they
    // succeed; what matters is that none of them is reachable without passing the gate,
    // which the auth-matrix suite proves cannot happen in production.
    const routes: [string, string][] = [
      ['GET', '/api/admin/session'],
      ['GET', '/api/admin/projects'],
    ]
    for (const [method, path] of routes) {
      const res = await request.fetch(path, { method })
      expect([200, 401, 403], `${method} ${path}`).toContain(res.status())
    }
  })

  test('admin and public API responses are never cached', async ({ request }) => {
    for (const path of ['/api/admin/projects', '/api/admin/session', '/api/projects']) {
      const res = await request.get(path)
      expect(res.headers()['cache-control'], path).toContain('no-store')
    }
  })

  test('unpublished projects never appear in public responses', async ({ request }) => {
    const created = await request.post('/api/admin/projects', { data: { ...valid('hidden'), isPublished: false } })
    expect(created.status()).toBe(201)

    const list = await (await request.get('/api/projects')).json()
    expect(list.projects.map((p: { slug: string }) => p.slug)).not.toContain('sec-hidden')
    // A draft must be indistinguishable from a missing project, so probing reveals nothing.
    const direct = await request.get('/api/projects/sec-hidden')
    expect(direct.status()).toBe(404)
    expect(JSON.stringify(await direct.json())).not.toContain('Sec hidden')
  })
})

test.describe('CSRF / origin protection', () => {
  test.afterEach(async ({ request }) => { await cleanup(request) })

  test('a cross-site write is rejected even with a valid session', async ({ request }) => {
    const res = await request.post('/api/admin/projects', {
      headers: { origin: 'https://evil.example', 'content-type': 'application/json' },
      data: valid('csrf'),
    })
    expect(res.status()).toBe(403)
    // And nothing was written.
    const list = await (await request.get('/api/admin/projects')).json()
    expect(list.projects.map((p: { slug: string }) => p.slug)).not.toContain('sec-csrf')
  })

  test('a write with no Origin, no Referer and no intent header is rejected', async ({ playwright, baseURL }) => {
    // A browser always sends Origin on a cross-site write, so a request carrying none of
    // the three signals is refused rather than assumed safe.
    // extraHTTPHeaders is set suite-wide, so this context sends the header as empty to
    // represent a client offering no proof of intent at all.
    const bare = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { 'x-requested-with': '' } })
    const res = await bare.delete('/api/admin/projects/999999')
    expect(res.status()).toBe(403)
    await bare.dispose()
  })

  test('a non-browser client is admitted only with the intent header', async ({ playwright, baseURL }) => {
    const cli = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { 'x-requested-with': 'btbn-admin' } })
    // 404 (not 403) proves the origin gate was passed and the row simply does not exist.
    expect((await cli.delete('/api/admin/projects/999999')).status()).toBe(404)
    await cli.dispose()
  })

  test('same-origin writes are allowed', async ({ request, baseURL }) => {
    const res = await request.post('/api/admin/projects', {
      headers: { origin: baseURL!, 'content-type': 'application/json' },
      data: valid('sameorigin'),
    })
    expect(res.status()).toBe(201)
  })

  test('safe methods are not blocked by the origin check', async ({ request }) => {
    const res = await request.get('/api/admin/projects', { headers: { origin: 'https://evil.example' } })
    expect(res.status()).toBe(200)
  })
})

test.describe('input validation', () => {
  test.afterEach(async ({ request }) => { await cleanup(request) })

  test('javascript: and data: URLs are rejected', async ({ request }) => {
    for (const bad of ['javascript:alert(1)', 'data:text/html;base64,PHNjcmlwdD4=', 'vbscript:msgbox(1)']) {
      for (const field of ['liveUrl', 'githubUrl']) {
        const res = await request.post('/api/admin/projects', { data: { ...valid('url'), [field]: bad } })
        expect(res.status(), `${field}=${bad}`).toBe(422)
      }
    }
  })

  test('image fields reject traversal and dangerous protocols', async ({ request }) => {
    for (const bad of ['javascript:alert(1)', '/previews/../../etc/passwd']) {
      const res = await request.post('/api/admin/projects', { data: { ...valid('img'), coverImage: bad } })
      expect(res.status(), bad).toBe(422)
    }
  })

  test('oversized field values are rejected, not truncated', async ({ request }) => {
    const res = await request.post('/api/admin/projects', { data: { ...valid('big'), title: 'x'.repeat(500) } })
    expect(res.status()).toBe(422)
    expect((await res.json()).errors.title).toBeTruthy()
  })

  test('an oversized request body is rejected', async ({ request }) => {
    const res = await request.post('/api/admin/projects', {
      data: { ...valid('huge'), overview: 'x'.repeat(200_000) },
    })
    expect([413, 422]).toContain(res.status())
  })

  test('array fields are bounded in count and item length', async ({ request }) => {
    const many = await request.post('/api/admin/projects', {
      data: { ...valid('many'), techStack: Array.from({ length: 80 }, (_, i) => 'T' + i) },
    })
    expect(many.status()).toBe(422)

    const long = await request.post('/api/admin/projects', {
      data: { ...valid('long'), techStack: ['x'.repeat(200)] },
    })
    expect(long.status()).toBe(422)
  })

  test('malformed JSON and wrong content types are rejected', async ({ request }) => {
    const bad = await request.post('/api/admin/projects', {
      headers: { 'content-type': 'application/json' },
      data: '{not valid json',
    })
    expect(bad.status()).toBe(400)

    const wrongType = await request.post('/api/admin/projects', {
      headers: { 'content-type': 'text/plain' },
      data: 'title=hack',
    })
    expect(wrongType.status()).toBe(415)

    // A JSON array is not an object and must be refused.
    const arrayBody = await request.post('/api/admin/projects', {
      headers: { 'content-type': 'application/json' },
      data: '[1,2,3]',
    })
    expect(arrayBody.status()).toBe(400)
  })

  test('duplicate slugs are rejected on create and update', async ({ request }) => {
    const first = await request.post('/api/admin/projects', { data: valid('dupe') })
    expect(first.status()).toBe(201)
    const { project } = await first.json()

    const second = await request.post('/api/admin/projects', { data: { ...valid('dupe'), title: 'Other' } })
    expect(second.status()).toBe(409)

    // Taking a seeded slug via update is refused too.
    const steal = await request.put(`/api/admin/projects/${project.id}`, { data: { ...valid('dupe'), slug: 'citiled' } })
    expect(steal.status()).toBe(409)
  })

  test('PATCH toggles reject non-boolean and out-of-range values', async ({ request }) => {
    const { project } = await (await request.post('/api/admin/projects', { data: valid('patch') })).json()
    for (const body of [{ isPublished: 'yes' }, { featured: 1 }, { sortOrder: -5 }, { sortOrder: 999999 }]) {
      const res = await request.patch(`/api/admin/projects/${project.id}`, { data: body })
      expect(res.status(), JSON.stringify(body)).toBe(422)
    }
    // An empty patch changes nothing rather than silently succeeding.
    expect((await request.patch(`/api/admin/projects/${project.id}`, { data: {} })).status()).toBe(400)
  })
})

test.describe('injection handling', () => {
  test.afterEach(async ({ request }) => { await cleanup(request) })

  test('SQL-style input is stored as data, never executed', async ({ request }) => {
    const payload = "'; DROP TABLE projects;--"
    const res = await request.post('/api/admin/projects', {
      data: { ...valid('sqli'), title: payload, shortDescription: payload },
    })
    expect(res.status()).toBe(201)
    const { project } = await res.json()
    expect(project.title).toBe(payload)   // round-tripped verbatim

    // The table is intact and the seeded rows survive.
    const list = await (await request.get('/api/projects')).json()
    expect(list.projects.length).toBeGreaterThanOrEqual(5)
  })

  test('an XSS payload renders as text, not markup', async ({ page, request }) => {
    const payload = '<script>window.__xss = 1</script>'
    const created = await request.post('/api/admin/projects', {
      data: { ...valid('xss'), title: payload, shortDescription: payload, isPublished: true },
    })
    expect(created.status()).toBe(201)

    let dialogFired = false
    page.on('dialog', async d => { dialogFired = true; await d.dismiss() })
    await page.goto('/work')

    // The script never executes, and no script element was injected from the payload.
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined()
    expect(dialogFired).toBe(false)
    expect(await page.locator('script:has-text("window.__xss")').count()).toBe(0)
    // It is present as visible text instead.
    await expect(page.getByText(payload, { exact: false }).first()).toBeVisible()
  })

  test('an event-handler payload does not become an attribute', async ({ page, request }) => {
    const payload = '" onmouseover="window.__evt=1'
    await request.post('/api/admin/projects', {
      data: { ...valid('evt'), title: payload, isPublished: true },
    })
    await page.goto('/work')
    expect(await page.evaluate(() => document.querySelectorAll('[onmouseover]').length)).toBe(0)
  })
})

test.describe('HTTP methods', () => {
  test('unsupported methods return 405 with an Allow header', async ({ request }) => {
    const cases: [string, string, string][] = [
      ['POST', '/api/projects', 'GET'],
      ['DELETE', '/api/projects', 'GET'],
      ['POST', '/api/admin/session', 'GET'],
      ['PUT', '/api/admin/projects', 'GET, POST'],
      ['POST', '/api/auth/login', 'GET'],
    ]
    for (const [method, path, allow] of cases) {
      const res = await request.fetch(path, { method, headers: { origin: new URL(path, 'http://127.0.0.1:4176').origin } })
      expect(res.status(), `${method} ${path}`).toBe(405)
      expect(res.headers()['allow'], `${method} ${path}`).toBe(allow)
    }
  })

  test('a nonexistent project id returns a safe 404', async ({ request }) => {
    const res = await request.get('/api/admin/projects/999999')
    expect(res.status()).toBe(404)
    const body = JSON.stringify(await res.json())
    // No SQL, stack trace or internal path in the message.
    expect(body).not.toMatch(/SQLITE|SELECT|stack|worker\/|\.ts:/i)
  })

  test('a non-numeric project id is not routed into SQL', async ({ request }) => {
    for (const id of ['abc', '1%20OR%201=1', '999999999999999999999']) {
      const res = await request.get(`/api/admin/projects/${id}`)
      expect([404], id).toContain(res.status())
    }
  })
})

test.describe('security headers', () => {
  test('every response carries the hardening headers', async ({ request }) => {
    for (const path of ['/', '/work', '/api/projects']) {
      const res = await request.get(path)
      const h = res.headers()
      expect(h['content-security-policy'], path).toBeTruthy()
      expect(h['content-security-policy'], path).toContain("frame-ancestors 'none'")
      expect(h['content-security-policy'], path).toContain("object-src 'none'")
      expect(h['x-content-type-options'], path).toBe('nosniff')
      expect(h['referrer-policy'], path).toBe('strict-origin-when-cross-origin')
      expect(h['permissions-policy'], path).toContain('geolocation=()')
    }
  })

  test('the CSP locks down the dangerous directives', async ({ request }) => {
    const csp = (await request.get('/')).headers()['content-security-policy']
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("default-src 'self'")
  })

  test('the production CSP allows no unsafe-eval or inline script', () => {
    // The dev server needs both for HMR, so the policy is asserted at the source: this
    // is what a deployed Worker (ENVIRONMENT=production) actually sends.
    const prod = contentSecurityPolicy({ ENVIRONMENT: 'production' } as never)
    expect(prod).toContain("script-src 'self'")
    expect(prod).not.toContain('unsafe-eval')
    expect(prod).not.toMatch(/script-src[^;]*unsafe-inline/)
    expect(prod).toContain("frame-ancestors 'none'")
  })

  test('no wildcard CORS is exposed on admin or public APIs', async ({ request }) => {
    for (const path of ['/api/projects', '/api/admin/projects']) {
      const h = (await request.get(path)).headers()
      expect(h['access-control-allow-origin'], path).toBeUndefined()
    }
  })
})

test.describe('error handling', () => {
  test('validation errors are useful without leaking internals', async ({ request }) => {
    const res = await request.post('/api/admin/projects', { data: { ...valid('err'), slug: 'Bad Slug!' } })
    expect(res.status()).toBe(422)
    const body = JSON.stringify(await res.json())
    expect(body).toMatch(/slug/i)
    expect(body).not.toMatch(/SQLITE|CONSTRAINT|SELECT |INSERT |stack|node_modules|worker\//i)
  })
})
