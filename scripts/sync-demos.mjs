import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const demos = [{ source: 'Coffee-shop', slug: 'morrow' }, { source: 'Beauty-salon', slug: 'lune' }, { source: 'Construction', slug: 'nomad' }]
for (const demo of demos) {
  const source = path.resolve(root, '..', demo.source, 'dist')
  const target = path.join(root, 'public', 'demos', demo.slug)
  if (!fs.existsSync(path.join(source, 'index.html'))) throw new Error('Build ' + demo.source + ' before syncing its demo.')
  fs.mkdirSync(target, { recursive: true })
  fs.cpSync(source, target, { recursive: true })
  const rewrite = directory => {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name)
      if (item.isDirectory()) rewrite(file)
      else if (/\.(html|css|js)$/.test(item.name)) {
        let text = fs.readFileSync(file, 'utf8')
        for (const asset of ['/assets/', '/images/', '/icons.svg', '/favicon.svg']) text = text.replaceAll(asset, '/demos/' + demo.slug + asset)
        if (item.name === 'index.html') text = text.replace('<head>', '<head>\n    <meta name="robots" content="noindex" />')
        fs.writeFileSync(file, text)
      }
    }
  }
  rewrite(target)
  console.log('Copied and rebased ' + demo.source + ' -> public/demos/' + demo.slug)
}
