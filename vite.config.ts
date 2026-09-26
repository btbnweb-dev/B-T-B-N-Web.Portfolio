import { cloudflare } from '@cloudflare/vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// The Cloudflare plugin runs worker/index.ts alongside the client during `vite dev`,
// with Wrangler's local D1 (Miniflare) bound as DB — so /api and /admin behave in
// development exactly as they will on a Worker.
export default defineConfig({
  plugins: [react(), tailwindcss(), cloudflare()],
})
