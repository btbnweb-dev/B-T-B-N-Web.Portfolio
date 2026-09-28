import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const routes = [
  '/', '/work', '/work/citiled', '/work/gaming-course', '/work/axion-x1',
  '/work/khure-residence', '/work/coffee-shop',
  '/work/lune-beauty', '/work/nomad-build', '/services', '/about', '/contact',
]
for (const width of [320, 390, 768, 1024, 1440]) {
  test('all routes, images, console and overflow at ' + width, async ({ page }) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: 900 })
    const errors: string[] = []
    const failedRequests: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    page.on('console', e => { if (e.type() === 'error') errors.push(e.text()) })
    page.on('requestfailed', request => failedRequests.push(request.url() + ' — ' + (request.failure()?.errorText || 'failed')))
    for (const route of routes) {
      await page.goto(route)
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('lang', 'mn')
      await expect(page).toHaveTitle(/B-T-B-N Web/)
      await expect(page.locator('h1')).toHaveCount(1)
      for (const image of await page.locator('main img').all()) {
        await image.scrollIntoViewIfNeeded()
        await expect.poll(() => image.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true)
      }
      await page.locator('footer').scrollIntoViewIfNeeded()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true)
      expect(await page.locator('h1,h2,h3,p,button').evaluateAll(nodes => nodes.filter(n => n.clientWidth > 0 && n.scrollWidth > n.clientWidth + 3).map(n => n.textContent)), route).toEqual([])
      expect(await page.locator('a[href^="#"]').evaluateAll(links => links.every(link => document.querySelector(link.getAttribute('href')!) !== null)), route).toBe(true)
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
      if (width === 390 || width === 1440) await page.screenshot({ path: 'verification/' + (route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')) + '-' + width + '.png', fullPage: true })
    }
    expect(errors).toEqual([])
    expect(failedRequests).toEqual([])
  })
}
test('project filtering and case study links preserve ordering', async ({ page }) => {
  await page.goto('/work')
  const group = page.getByRole('group', { name: 'Төслийн ангилал' })
  for (const [filter, count] of [['Production', 1], ['Full-stack', 2], ['Landing Page', 2], ['Concept', 5], ['Бүгд', 7]] as const) {
    await group.getByRole('button', { name: filter }).click()
    await expect(page.locator('.feature-project, .concept-card')).toHaveCount(count)
    await expect(group.getByRole('button', { name: filter })).toHaveAttribute('aria-pressed', 'true')
  }
  for (const slug of ['citiled', 'gaming-course', 'axion-x1', 'khure-residence', 'coffee-shop', 'lune-beauty', 'nomad-build']) {
    await page.goto('/work')
    await page.locator('.project-link[href="/work/' + slug + '"]').click()
    await expect(page).toHaveURL('/work/' + slug)
    await expect(page.locator('#main')).toBeFocused()
    await expect(page.locator('.desktop-nav a[href="/work"]')).toHaveAttribute('aria-current', 'page')
    await page.locator('.next-project a').click()
    await expect(page.locator('h1')).toBeVisible()
  }
})
test('history, route transition, scroll reset and 404', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await page.locator('.hero-actions a[href="/work"]').click()
  await expect(page).toHaveURL('/work')
  await expect(page.locator('.route-page')).toHaveCSS('animation-name', 'page-in')
  await page.locator('.project-link').first().click()
  await expect(page).toHaveURL('/work/citiled')
  await page.goBack()
  await expect(page).toHaveURL('/work')
  await expect(page.locator('h1')).toContainText('Бүтээсэн ажлууд')
  await page.goForward()
  await expect(page.locator('h1')).toHaveText('Citiled')
  await page.goto('/does-not-exist')
  await expect(page.locator('h1')).toContainText('олдсонгүй')
  await page.getByRole('link', { name: 'Ажлууд руу очих' }).click()
  await expect(page).toHaveURL('/work')
})
test('mobile menu supports keyboard, escape, route changes and resize', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const toggle = page.locator('.menu-toggle')
  const nav = page.getByRole('navigation', { name: 'Гар утасны цэс' })
  await toggle.focus(); await page.keyboard.press('Enter')
  await expect(nav).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(nav.getByRole('link').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(toggle).toBeFocused()
  await expect(nav).toBeHidden()
  await toggle.click()
  await nav.getByRole('link', { name: 'Ажлууд' }).click()
  await expect(page).toHaveURL('/work')
  await expect(nav).toBeHidden()
  await toggle.click()
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(nav).toBeHidden()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})
/** Fills the inquiry form with a valid enquiry. */
async function fillEnquiry(page: import('@playwright/test').Page) {
  await page.locator('#contact-name').fill('Бат')
  await page.locator('#contact-email').fill('test@example.com')
  await page.locator('#contact-phone').fill('+976 9911 2233')
  await page.locator('#contact-company').fill('Тест компани')
  await page.locator('#contact-type').selectOption('fullstack')
  await page.locator('#contact-budget').selectOption({ index: 2 })
  await page.locator('#contact-message').fill('Каталог болон админ самбар бүхий сайт.')
}
test('contact validates every required field and optional phone before sending', async ({ page }) => {
  const posts: string[] = []
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()) })
  await page.goto('/contact')
  // Seven visible fields plus the hidden honeypot.
  await expect(page.locator('form input:not([name="website"]),form select,form textarea')).toHaveCount(7)
  await page.locator('form button[type="submit"]').click()
  await expect(page.locator('.field-error')).toHaveCount(4)
  await expect(page.locator('#contact-name')).toBeFocused()
  await page.locator('#contact-name').fill('Бат')
  await page.locator('#contact-email').fill('bad@')
  await page.locator('#contact-phone').fill('123')
  await page.locator('#contact-type').selectOption('fullstack')
  await page.locator('#contact-message').fill('Каталог болон админ самбар бүхий сайт.')
  await page.locator('form button[type="submit"]').click()
  await expect(page.locator('.field-error')).toHaveCount(2)
  await expect(page.locator('#contact-email')).toBeFocused()
  // Nothing may leave the browser while the form is invalid.
  expect(posts).toEqual([])
})
test('a valid enquiry is sent, with subject, reply-to and every field', async ({ page }) => {
  let body: Record<string, string> | null = null
  await page.route('**/formspree.io/**', async route => {
    body = JSON.parse(route.request().postData() || '{}')
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await page.goto('/contact')
  await fillEnquiry(page)
  await page.locator('form button[type="submit"]').click()
  await expect(page.locator('.success')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('илгээгдлээ')
  const sent = body as unknown as Record<string, string>
  expect(sent._subject).toBe('B-T-B-N Web — Шинэ төсөл: Full-stack System')
  expect(sent._replyto).toBe('test@example.com')
  expect(sent['Нэр']).toBe('Бат')
  expect(sent['Утас']).toBe('+976 9911 2233')
  expect(sent['Компанийн нэр']).toBe('Тест компани')
  expect(sent['Төслийн төрөл']).toBe('Full-stack System')
  expect(sent['Төслийн тухай']).toContain('Каталог')
  expect(sent['Төсөв']).toBeTruthy()
  // Reset clears the form for a fresh enquiry.
  await page.getByRole('button', { name: 'Дахин бөглөх' }).click()
  await expect(page.locator('#contact-name')).toBeFocused()
  await expect(page.locator('#contact-name')).toHaveValue('')
  await expect(page.locator('#contact-type')).toHaveValue('')
  await expect(page.locator('.success')).toHaveCount(0)
})
test('a failed submission is reported and offers the email fallback', async ({ page }) => {
  await page.route('**/formspree.io/**', route => route.abort('failed'))
  await page.goto('/contact')
  await fillEnquiry(page)
  await page.locator('form button[type="submit"]').click()
  await expect(page.locator('.failure')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('алдаа гарлаа')
  // The visitor is given a direct way through.
  await expect(page.locator('.failure a[href="mailto:btbnweb@gmail.com"]')).toBeVisible()
  // Retrying clears the error but keeps what was typed.
  await page.getByRole('button', { name: 'Дахин оролдох' }).click()
  await expect(page.locator('.failure')).toHaveCount(0)
  await expect(page.locator('#contact-name')).toHaveValue('Бат')
})
test('submitting shows a loading state and cannot be fired twice', async ({ page }) => {
  let hits = 0
  await page.route('**/formspree.io/**', async route => {
    hits++
    await new Promise(r => setTimeout(r, 1200))
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' })
  })
  await page.goto('/contact')
  await fillEnquiry(page)
  const submit = page.locator('form button[type="submit"]')
  await submit.click()
  // While in flight the button is disabled and says so, so a second click cannot land.
  await expect(submit).toBeDisabled()
  await expect(submit).toContainText('Илгээж байна')
  await expect(submit).toHaveAttribute('aria-busy', 'true')
  await expect(page.locator('.success')).toBeVisible({ timeout: 15000 })
  expect(hits).toBe(1)
})
test('a bot filling the honeypot never reaches the inbox', async ({ page }) => {
  let hits = 0
  await page.route('**/formspree.io/**', async route => { hits++; await route.fulfill({ status: 200, body: '{}' }) })
  await page.goto('/contact')
  await fillEnquiry(page)
  await page.locator('#contact-website').fill('http://spam.example')
  await page.locator('form button[type="submit"]').click()
  await expect(page.locator('.success')).toBeVisible()
  expect(hits).toBe(0)
})
test('motion, reveals, hover cursor, navbar and reading progress', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  await expect(page.locator('.hero-mark .m-ring').first()).toHaveCSS('animation-name', 'spin')
  await page.locator('.project-link').first().hover()
  await expect(page.locator('.project-cursor')).toHaveClass(/is-active/)
  await expect(page.locator('.site-header')).toHaveClass(/is-scrolled/)
  await expect(page.locator('.site-header')).toHaveCSS('backdrop-filter', 'blur(16px) saturate(1.4)')
  await page.locator('.project-link').first().click()
  await page.locator('#development').scrollIntoViewIfNeeded()
  await expect(page.locator('.reading-progress')).not.toHaveCSS('transform', 'matrix(0, 0, 0, 1, 0, 0)')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.project-cursor')).toHaveCSS('display', 'none')
  await expect(page.locator('.route-page')).toHaveCSS('animation-name', 'none')
  for (const reveal of await page.locator('.reveal').all()) await expect(reveal).toHaveCSS('opacity', '1')
  await page.goto('/')
  await expect(page.locator('.hero-mark .m-ring').first()).toHaveCSS('animation-name', 'none')
})
test('service workflow is keyboard operable', async ({ page }) => {
  await page.goto('/services')
  await expect(page.locator('.service-row')).toHaveCount(5)
  const details = page.locator('details').nth(1)
  await details.locator('summary').focus(); await page.keyboard.press('Enter')
  await expect(details.locator('p')).toBeVisible()
})
test('major and flagship projects expose live site links and outrank secondary concepts', async ({ page }) => {
  await page.goto('/')
  // Citiled and ArenaHub lead the page as full-width feature blocks.
  // Four features (Citiled, ArenaHub, AXION X1, KHURE) since SULD was unpublished.
  await expect(page.locator('.feature-project')).toHaveCount(4)
  await expect(page.locator('.concept-card')).toHaveCount(3)
  await expect(page.locator('.feature-project').first().locator('h3')).toHaveText('Citiled')
  await expect(page.locator('.feature-project').nth(1).locator('h3')).toHaveText('ArenaHub')
  // Feature frames are visually larger than concept frames.
  const feature = await page.locator('.feature-project .project-visual').first().boundingBox()
  const concept = await page.locator('.concept-card .project-visual').first().boundingBox()
  expect(feature!.width).toBeGreaterThan(concept!.width)
  // Both deployed projects link out to their real origins.
  for (const [name, host] of [['Citiled', 'citiled.citiled-mn.workers.dev'], ['ArenaHub', 'btbn-arenahub.vercel.app']] as const) {
    const card = page.locator('.feature-project').filter({ has: page.getByRole('heading', { name, exact: true }) })
    const live = card.locator('a.live-link')
    await expect(live).toHaveAttribute('href', 'https://' + host)
    await expect(live).toHaveAttribute('target', '_blank')
    await expect(live).toHaveAttribute('rel', /noopener/)
    // Accessible name identifies the project, not just the icon.
    await expect(live).toHaveAttribute('aria-label', new RegExp(name + ' live site үзэх'))
  }
  // Concept work is labelled as such rather than implied to be client work.
  for (const card of await page.locator('.concept-card').all()) await expect(card.locator('.status-pill')).toHaveText('Concept Project')
})
test('case study live links point at the real deployments', async ({ page }) => {
  for (const [slug, host] of [['citiled', 'citiled.citiled-mn.workers.dev'], ['gaming-course', 'btbn-arenahub.vercel.app']] as const) {
    await page.goto('/work/' + slug)
    for (const link of await page.getByRole('link', { name: /Live Site/ }).all()) {
      await expect(link).toHaveAttribute('href', 'https://' + host)
      await expect(link).toHaveAttribute('target', '_blank')
    }
    await expect(page.locator('#architecture')).toBeAttached()
    await expect(page.locator('.sticky-step')).toHaveCount(4)
  }
})
test('case study sidebar tracks the section being read', async ({ page }) => {
  await page.goto('/work/citiled')
  await page.locator('#development').scrollIntoViewIfNeeded()
  await expect(page.locator('.case-sidebar nav a.is-current')).toHaveAttribute('href', '#development')
  await page.locator('#overview').scrollIntoViewIfNeeded()
  await expect(page.locator('.case-sidebar nav a.is-current')).toHaveAttribute('href', '#overview')
})
// The only contact destinations allowed to appear anywhere on the site.
const OFFICIAL = {
  email: 'btbnweb@gmail.com',
  github: 'https://github.com/btbnweb-dev?tab=repositories',
  facebook: 'https://www.facebook.com/profile.php?id=61594587243741',
  instagram: 'https://www.instagram.com/btbn_web/',
}
test('no personal data or portrait is exposed, and contact links are the official ones', async ({ page }) => {
  test.setTimeout(90000)
  for (const route of routes) {
    await page.goto(route)
    // No photographic portrait: every image is a project screenshot or concept asset.
    const imgs = await page.locator('img').evaluateAll(nodes => nodes.map(n => (n as HTMLImageElement).getAttribute('src') || ''))
    expect(imgs.filter(src => /portrait|avatar|profile|headshot|me\.|selfie/i.test(src)), route).toEqual([])
    // Every mailto goes to the business address; no tel link publishes a private number.
    const mail = await page.locator('a[href^="mailto:"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')))
    expect([...new Set(mail)].filter(h => h !== 'mailto:' + OFFICIAL.email), route).toEqual([])
    expect(await page.locator('a[href^="tel:"]').count(), route).toBe(0)
    // Social destinations are exactly the four official business profiles — nothing guessed.
    const social = await page.locator('a[href]').evaluateAll(nodes => nodes
      .map(n => n.getAttribute('href') || '')
      .filter(h => /facebook|instagram|github\.com|linkedin|twitter|t\.me/i.test(h)))
    const allowed = [OFFICIAL.github, OFFICIAL.facebook, OFFICIAL.instagram]
    expect(social.filter(h => !allowed.includes(h)), route).toEqual([])
    // Visible copy must not leak an address, birthday, age or school.
    const text = await page.locator('main').innerText()
    expect(text, route).not.toMatch(/\b(төрсөн|насны|нас:|сургууль|их сургууль|дүүрэг|хороо|байр|тоот)\b/i)
    // A bare 8-digit Mongolian number would be a real phone; the form placeholder is an input, not text.
    expect(text.replace(/\s/g, ''), route).not.toMatch(/(\+976)?\d{8}(?!\d)/)
  }
})
test('official channels are reachable and open safely', async ({ page }) => {
  await page.goto('/contact')
  const block = page.locator('.contact-aside .direct-contact')
  // Email opens a mail client rather than a new tab.
  const mail = block.locator('a[href^="mailto:"]')
  await expect(mail).toHaveAttribute('href', 'mailto:' + OFFICIAL.email)
  await expect(mail).not.toHaveAttribute('target', '_blank')
  // Each social profile opens in a new tab and cannot reach back via window.opener.
  for (const href of [OFFICIAL.github, OFFICIAL.facebook, OFFICIAL.instagram]) {
    const link = block.locator('a[href="' + href + '"]')
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noopener/)
  }
  // Nothing is left in the "being set up" state.
  expect(await page.locator('.channel-pending').count()).toBe(0)
  await expect(page.locator('main')).not.toContainText('бэлтгэгдэж байна')
  // The footer carries the same channels on every route.
  await page.goto('/')
  const footer = page.locator('.footer-social')
  await expect(footer.locator('a[href^="mailto:"]')).toHaveAttribute('href', 'mailto:' + OFFICIAL.email)
  await expect(footer.locator('a[target="_blank"]')).toHaveCount(3)
})
test('body copy stays legible rather than shrinking into fine print', async ({ page }) => {
  for (const route of ['/', '/work/citiled', '/services', '/about']) {
    await page.goto(route)
    // Prose should not render below 14px — the previous build leaned on 9-12px text.
    // Monospaced text is excluded: those are technical labels and section markers, not reading copy.
    const small = await page.locator('main p').evaluateAll(nodes => nodes
      .filter(n => (n as HTMLElement).offsetParent !== null
        && !getComputedStyle(n).fontFamily.includes('Mono')
        && parseFloat(getComputedStyle(n).fontSize) < 14)
      .map(n => n.textContent?.slice(0, 40)))
    expect(small, route).toEqual([])
  }
})
// Every project's deployed site, keyed by route slug.
const LIVE: Record<string, string> = {
  citiled: 'https://citiled.citiled-mn.workers.dev',
  'gaming-course': 'https://btbn-arenahub.vercel.app',
  'axion-x1': 'https://btbn-axion-gpu.vercel.app',
  'khure-residence': 'https://btbn-khure-resideence.vercel.app',
  'coffee-shop': 'https://btbn-morrow-coffee.vercel.app',
  'lune-beauty': 'https://btbn-lune-beauty.vercel.app',
  'nomad-build': 'https://btbn-nomad-build.vercel.app',
}
test('every case study links to its own deployment, safely and with a readable label', async ({ page }) => {
  for (const [slug, url] of Object.entries(LIVE)) {
    await page.goto('/work/' + slug)
    const live = page.locator('a.live-link[target="_blank"], .case-sidebar a[target="_blank"]')
    expect(await live.count(), slug).toBeGreaterThan(0)
    for (const link of await live.all()) {
      await expect(link, slug).toHaveAttribute('href', url)
      await expect(link, slug).toHaveAttribute('rel', /noopener/)
      // The label names the project rather than relying on the arrow icon alone.
      const label = (await link.getAttribute('aria-label')) || ''
      expect(label, slug).toMatch(/live site үзэх/i)
    }
  }
})
test('concept projects expose a live site link on home and work without losing their label', async ({ page }) => {
  for (const route of ['/', '/work']) {
    await page.goto(route)
    const cards = page.locator('.concept-card')
    await expect(cards).toHaveCount(3)
    for (const [slug, url] of [['coffee-shop', LIVE['coffee-shop']], ['lune-beauty', LIVE['lune-beauty']], ['nomad-build', LIVE['nomad-build']]] as const) {
      const card = cards.filter({ has: page.locator('a[href="/work/' + slug + '"]') })
      // Case study link is kept alongside the new live action.
      await expect(card.locator('a.case-link'), route + ' ' + slug).toHaveAttribute('href', '/work/' + slug)
      const live = card.locator('a.live-link')
      await expect(live, route + ' ' + slug).toHaveAttribute('href', url)
      await expect(live, route + ' ' + slug).toHaveAttribute('target', '_blank')
      await expect(live, route + ' ' + slug).toHaveAttribute('rel', /noopener/)
      // Concept framing must survive the addition.
      await expect(card.locator('.status-pill'), route + ' ' + slug).toHaveText('Concept Project')
    }
  }
})
test('no local demo or placeholder project links remain', async ({ page }) => {
  for (const route of routes) {
    await page.goto(route)
    const hrefs = await page.locator('a[href]').evaluateAll(nodes => nodes.map(n => n.getAttribute('href') || ''))
    // The old /demos/*.html links and empty "#" placeholders must be gone.
    expect(hrefs.filter(h => h.includes('/demos/')), route).toEqual([])
    expect(hrefs.filter(h => h === '#' || h === ''), route).toEqual([])
    // Citiled and ArenaHub destinations are untouched.
    const external = hrefs.filter(h => h.startsWith('http') && !/github|facebook|instagram/.test(h))
    expect(external.filter(h => !Object.values(LIVE).includes(h)), route).toEqual([])
  }
})
for (const width of [390, 1440]) {
  for (const route of routes) {
    test('accessibility ' + route + ' at ' + width, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(route)
      const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      expect(result.violations).toEqual([])
    })
  }
}
test('contact error and success states remain accessible', async ({ page }) => {
  await page.goto('/contact')
  await page.locator('form button[type="submit"]').click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
  await page.locator('#contact-name').fill('Тест')
  await page.locator('#contact-email').fill('test@example.com')
  await page.locator('#contact-type').selectOption('business')
  await page.locator('#contact-message').fill('Бизнесийн сайт.')
  await page.locator('form button[type="submit"]').click()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
})
