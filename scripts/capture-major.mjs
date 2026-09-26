import { chromium } from '@playwright/test'
// Captures public marketing pages of the two deployed projects. No authentication,
// no admin areas and no private data are used; only pages any visitor can open.
const browser = await chromium.launch()
const shot = (page, path) => page.screenshot({ path: 'public/previews/' + path, type: 'jpeg', quality: 86 })
const settle = async page => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1200) }
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })

  const citiled = 'https://citiled.citiled-mn.workers.dev'
  await page.goto(citiled, { waitUntil: 'networkidle', timeout: 90000 })
  await settle(page)
  await shot(page, 'citiled-desktop.jpg')
  console.log('Citiled:', await page.title(), page.url())
  await page.setViewportSize({ width: 390, height: 844 })
  await settle(page)
  await shot(page, 'citiled-mobile.jpg')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(citiled + '/products', { waitUntil: 'networkidle', timeout: 90000 })
  await settle(page)
  await shot(page, 'citiled-catalog.jpg')

  const arena = 'https://btbn-arenahub.vercel.app'
  await page.goto(arena, { waitUntil: 'networkidle', timeout: 90000 })
  await settle(page)
  await shot(page, 'gaming-desktop.jpg')
  console.log('ArenaHub:', await page.title(), page.url())
  await page.setViewportSize({ width: 390, height: 844 })
  await settle(page)
  await shot(page, 'gaming-mobile.jpg')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(arena, { waitUntil: 'networkidle', timeout: 90000 })
  await settle(page)
  const courses = page.locator('#courses, [id*="course"]').first()
  if (await courses.count()) { await courses.scrollIntoViewIfNeeded(); await page.waitForTimeout(800) }
  else await page.evaluate(() => scrollTo({ top: innerHeight * 2, behavior: 'instant' }))
  await shot(page, 'gaming-courses.jpg')
  console.log('Captured public pages of both deployed projects.')
} finally { await browser.close() }
