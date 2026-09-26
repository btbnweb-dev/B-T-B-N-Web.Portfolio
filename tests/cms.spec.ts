import { test, expect } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'

/**
 * CMS/admin tests. These run against the local `wrangler dev` stack with Miniflare D1,
 * so they exercise the real Worker, real SQL and the real auth gate.
 *
 * Each test cleans up the rows it creates so the suite can run repeatedly.
 */

const SEEDED = [
  'citiled', 'gaming-course', 'axion-x1', 'khure-residence', 'suld-cashmere',
  'coffee-shop', 'lune-beauty', 'nomad-build',
]

const sample = (suffix: string) => ({
  title: 'Test Project ' + suffix,
  slug: 'test-project-' + suffix,
  category: 'Concept Landing Page',
  projectType: 'concept',
  status: 'Concept Project',
  year: '2026',
  role: 'Дизайн · Frontend',
  headline: 'Туршилтын толгой мөр.',
  shortDescription: 'Автомат тестээр үүсгэсэн түр төсөл.',
  techStack: 'React, TypeScript',
  filters: 'Concept',
  liveUrl: 'https://example.com',
  githubUrl: 'https://github.com/btbnweb-dev/example',
  coverImage: '/previews/morrow-desktop.jpg',
  desktopImage: '/previews/morrow-desktop.jpg',
  mobileImage: '/previews/morrow-mobile.jpg',
  detailImage: '/previews/morrow-desktop.jpg',
  accent: 'coffee',
  sortOrder: 900,
  featured: false,
  isPublished: false,
})

/** Removes any leftover test rows so reruns start clean. */
async function cleanup(api: APIRequestContext, prefix = 'test-project-') {
  const res = await api.get('/api/admin/projects')
  if (!res.ok()) return
  const { projects } = await res.json()
  for (const p of projects) if (p.slug.startsWith(prefix)) await api.delete(`/api/admin/projects/${p.id}`)
}

test.describe('local D1 seed', () => {
  test('the eight portfolio projects load from the database', async ({ request }) => {
    const res = await request.get('/api/projects')
    expect(res.ok()).toBe(true)
    const { projects } = await res.json()
    expect(projects.map((p: { slug: string }) => p.slug)).toEqual(SEEDED)
    // Case-study content survived the migration, not just the titles.
    const citiled = projects.find((p: { slug: string }) => p.slug === 'citiled')
    expect(citiled.title).toBe('Citiled')
    expect(citiled.techStack).toContain('PostgreSQL')
    expect(citiled.scenes.length).toBe(4)
    expect(citiled.features.length).toBe(6)
    expect(citiled.overview.length).toBeGreaterThan(100)
    expect(citiled.live_url).toBe('https://citiled.citiled-mn.workers.dev')
    // Production work and the three flagship concepts retain feature weight.
    expect(projects.filter((p: { featured: boolean }) => p.featured).map((p: { slug: string }) => p.slug))
      .toEqual(['citiled', 'gaming-course', 'axion-x1', 'khure-residence', 'suld-cashmere'])
  })

  test('public case study routes still resolve for every seeded project', async ({ page }) => {
    test.setTimeout(90000)
    for (const slug of SEEDED) {
      await page.goto('/work/' + slug)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('.case-header h1')).not.toBeEmpty()
    }
  })
})

test.describe('admin access', () => {
  test('dashboard opens in local dev mode and shows the dev indicator', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.locator('.admin-devflag')).toHaveText('LOCAL DEV ADMIN')
    await expect(page.locator('.admin-user strong')).toHaveText('Local Admin')
    await expect(page.locator('.admin-stat')).toHaveCount(5)
    // Totals reflect the database, not a hardcoded array.
    const total = await page.locator('.admin-stat').first().locator('.admin-stat-value').innerText()
    expect(Number(total)).toBeGreaterThanOrEqual(5)
  })

  test('project list renders every row including unpublished ones', async ({ page, request }) => {
    await cleanup(request)
    const created = await request.post('/api/admin/projects', { data: { ...sample('hidden'), isPublished: false } })
    expect(created.status()).toBe(201)
    await page.goto('/admin/projects')
    await expect(page.getByText('Test Project hidden')).toBeVisible()
    await cleanup(request)
  })
})

test.describe('project lifecycle', () => {
  test.afterEach(async ({ request }) => { await cleanup(request) })

  test('create, publish, appear publicly, unpublish, disappear', async ({ request }) => {
    const create = await request.post('/api/admin/projects', { data: sample('lifecycle') })
    expect(create.status()).toBe(201)
    const { project } = await create.json()
    expect(project.slug).toBe('test-project-lifecycle')
    expect(project.isPublished).toBe(false)

    // Unpublished work is invisible to the public API and its case-study route.
    let list = await (await request.get('/api/projects')).json()
    expect(list.projects.map((p: { slug: string }) => p.slug)).not.toContain('test-project-lifecycle')
    expect((await request.get('/api/projects/test-project-lifecycle')).status()).toBe(404)

    // Publishing makes it public with no code change.
    await request.patch(`/api/admin/projects/${project.id}`, { data: { isPublished: true } })
    list = await (await request.get('/api/projects')).json()
    expect(list.projects.map((p: { slug: string }) => p.slug)).toContain('test-project-lifecycle')
    expect((await request.get('/api/projects/test-project-lifecycle')).status()).toBe(200)

    // Unpublishing hides it again.
    await request.patch(`/api/admin/projects/${project.id}`, { data: { isPublished: false } })
    list = await (await request.get('/api/projects')).json()
    expect(list.projects.map((p: { slug: string }) => p.slug)).not.toContain('test-project-lifecycle')
  })

  test('a published project is reachable on /work and its case study page', async ({ page, request }) => {
    const create = await request.post('/api/admin/projects', { data: { ...sample('public'), isPublished: true } })
    const { project } = await create.json()

    await page.goto('/work')
    await expect(page.getByRole('heading', { name: 'Test Project public' })).toBeVisible()

    await page.goto('/work/test-project-public')
    // The hero splits the title into animated per-word lines, so match the words.
    await expect(page.locator('.case-header h1')).toContainText('Test')
    await expect(page.locator('.case-header h1 .line')).toHaveCount(3)
    await expect(page.locator('a.live-link').first()).toHaveAttribute('href', 'https://example.com')

    await request.delete(`/api/admin/projects/${project.id}`)
  })

  test('edit updates the stored values', async ({ request }) => {
    const { project } = await (await request.post('/api/admin/projects', { data: sample('edit') })).json()
    const res = await request.put(`/api/admin/projects/${project.id}`, {
      data: { ...sample('edit'), title: 'Renamed Project', shortDescription: 'Шинэчилсэн тайлбар.' },
    })
    expect(res.ok()).toBe(true)
    const updated = (await res.json()).project
    expect(updated.title).toBe('Renamed Project')
    expect(updated.short_description).toBe('Шинэчилсэн тайлбар.')
  })

  test('sort order controls public ordering', async ({ request }) => {
    const a = (await (await request.post('/api/admin/projects', { data: { ...sample('order-a'), isPublished: true, sortOrder: 950 } })).json()).project
    const b = (await (await request.post('/api/admin/projects', { data: { ...sample('order-b'), isPublished: true, sortOrder: 910 } })).json()).project

    const order = (list: { slug: string }[]) => list.filter(p => p.slug.startsWith('test-project-order')).map(p => p.slug)
    let { projects } = await (await request.get('/api/projects')).json()
    expect(order(projects)).toEqual(['test-project-order-b', 'test-project-order-a'])

    // Reordering through the admin API changes the public sequence.
    await request.patch(`/api/admin/projects/${a.id}`, { data: { sortOrder: 900 } })
    projects = (await (await request.get('/api/projects')).json()).projects
    expect(order(projects)).toEqual(['test-project-order-a', 'test-project-order-b'])
    await request.delete(`/api/admin/projects/${b.id}`)
  })

  test('featured toggle promotes a project to the major tier', async ({ page, request }) => {
    const { project } = await (await request.post('/api/admin/projects', { data: { ...sample('featured'), isPublished: true } })).json()
    await request.patch(`/api/admin/projects/${project.id}`, { data: { featured: true } })

    const { projects } = await (await request.get('/api/projects')).json()
    expect(projects.find((p: { slug: string }) => p.slug === 'test-project-featured').featured).toBe(true)

    // Featured rows render as full-width feature blocks rather than concept cards.
    await page.goto('/work')
    const card = page.locator('.feature-project').filter({ hasText: 'Test Project featured' })
    await expect(card).toHaveCount(1)
  })

  test('delete removes the project everywhere', async ({ request }) => {
    const { project } = await (await request.post('/api/admin/projects', { data: { ...sample('delete'), isPublished: true } })).json()
    const res = await request.delete(`/api/admin/projects/${project.id}`)
    expect(res.ok()).toBe(true)
    expect((await request.get(`/api/admin/projects/${project.id}`)).status()).toBe(404)
    const { projects } = await (await request.get('/api/projects')).json()
    expect(projects.map((p: { slug: string }) => p.slug)).not.toContain('test-project-delete')
  })
})

test.describe('server-side validation', () => {
  test.afterEach(async ({ request }) => { await cleanup(request) })

  test('a duplicate slug is rejected', async ({ request }) => {
    await request.post('/api/admin/projects', { data: sample('dupe') })
    const second = await request.post('/api/admin/projects', { data: { ...sample('dupe'), title: 'Another' } })
    expect(second.status()).toBe(409)
    expect((await second.json()).errors.slug).toBeTruthy()
  })

  test('an existing seeded slug cannot be taken', async ({ request }) => {
    const res = await request.post('/api/admin/projects', { data: { ...sample('x'), slug: 'citiled' } })
    expect(res.status()).toBe(409)
  })

  test('invalid URLs are rejected', async ({ request }) => {
    for (const field of ['liveUrl', 'githubUrl']) {
      const res = await request.post('/api/admin/projects', { data: { ...sample('url'), [field]: 'not-a-url' } })
      expect(res.status(), field).toBe(422)
      expect((await res.json()).errors[field], field).toBeTruthy()
    }
    // javascript: URLs must not slip through.
    const xss = await request.post('/api/admin/projects', { data: { ...sample('url'), liveUrl: 'javascript:alert(1)' } })
    expect(xss.status()).toBe(422)
  })

  test('required fields and malformed values are rejected', async ({ request }) => {
    const empty = await request.post('/api/admin/projects', { data: { ...sample('req'), title: '', slug: '', category: '' } })
    expect(empty.status()).toBe(422)
    const errors = (await empty.json()).errors
    expect(errors.title).toBeTruthy()
    expect(errors.slug).toBeTruthy()
    expect(errors.category).toBeTruthy()

    // Slug format, year format and sort range are all enforced server-side.
    expect((await request.post('/api/admin/projects', { data: { ...sample('req'), slug: 'Bad Slug!' } })).status()).toBe(422)
    expect((await request.post('/api/admin/projects', { data: { ...sample('req'), year: '20xx' } })).status()).toBe(422)
    expect((await request.post('/api/admin/projects', { data: { ...sample('req'), sortOrder: -5 } })).status()).toBe(422)
  })

  test('a non-JSON body is refused', async ({ request }) => {
    // Wrong media type is 415; a malformed JSON body is 400.
    const wrongType = await request.post('/api/admin/projects', { headers: { 'content-type': 'text/plain' }, data: 'title=hack' })
    expect(wrongType.status()).toBe(415)
    const malformed = await request.post('/api/admin/projects', { headers: { 'content-type': 'application/json' }, data: '{broken' })
    expect(malformed.status()).toBe(400)
  })
})

test.describe('admin UI flows', () => {
  test.afterEach(async ({ request }) => { await cleanup(request) })

  test('a project can be created through the form and shows validation errors', async ({ page }) => {
    await page.goto('/admin/projects/new')

    // Submitting empty surfaces server-side field errors in the form. Validation is a
    // round trip to the Worker, so wait for that response rather than the click alone.
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/admin/projects') && r.request().method() === 'POST'),
      page.locator('button[type="submit"]').click(),
    ])
    await expect(page.locator('.admin-fielderror').first()).toBeVisible()

    await page.locator('#f-title').fill('Test Project form')
    await page.locator('#f-category').fill('Concept Landing Page')
    await page.locator('#f-slug').fill('test-project-form')
    await page.locator('#f-liveUrl').fill('https://example.com')
    await page.getByLabel('Нийтлэх').check()
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/admin\/projects$/)
    await expect(page.getByText('Test Project form')).toBeVisible()

    // It is immediately public — no React array was edited.
    await page.goto('/work/test-project-form')
    await expect(page.locator('.case-header h1')).toContainText('Test')
    await expect(page.locator('.case-header h1')).toContainText('form')
  })

  test('the form reports a duplicate slug rather than silently failing', async ({ page, request }) => {
    await request.post('/api/admin/projects', { data: sample('clash') })
    await page.goto('/admin/projects/new')
    await page.locator('#f-title').fill('Clashing')
    await page.locator('#f-category').fill('Concept')
    await page.locator('#f-slug').fill('test-project-clash')
    await Promise.all([
      page.waitForResponse(r => r.url().includes('/api/admin/projects') && r.request().method() === 'POST'),
      page.locator('button[type="submit"]').click(),
    ])
    await expect(page.locator('#slug-err')).toBeVisible()
  })
})
