import { chromium } from '@playwright/test'
import fs from 'node:fs'

const origin = process.env.PORTFOLIO_URL || 'http://127.0.0.1:5176'
fs.mkdirSync('public/previews', { recursive: true })
const browser = await chromium.launch()
try {
  const context = await browser.newContext({ reducedMotion: 'reduce' })
  const page = await context.newPage()
  for (const slug of ['morrow', 'lune', 'nomad']) {
    for (const [device, width, height] of [['desktop', 1440, 1000], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height })
      await page.goto(origin + '/demos/' + slug + '/index.html', { waitUntil: 'networkidle' })
      await page.evaluate(() => document.fonts.ready)
      await page.locator('h1').waitFor()
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
      await page.screenshot({ path: 'public/previews/' + slug + '-' + device + '.jpg', type: 'jpeg', quality: 85 })
      console.log('Captured ' + slug + ' ' + device)
    }
  }
} finally { await browser.close() }
