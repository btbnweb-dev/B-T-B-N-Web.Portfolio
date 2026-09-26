export type Env = {
  DB: D1Database
  ASSETS: Fetcher
  ENVIRONMENT?: string
  LOCAL_ADMIN_DEV?: string
  /** Google OAuth. Secrets come from .dev.vars locally, `wrangler secret` in production. */
  GOOGLE_CLIENT_ID?: string
  GOOGLE_CLIENT_SECRET?: string
  SESSION_SECRET?: string
  /** Comma-separated list of addresses allowed into the admin. */
  ADMIN_EMAILS?: string
  /** Cloudflare Access. Set at deployment; both are required for Access verification. */
  ACCESS_TEAM_DOMAIN?: string
  ACCESS_AUD?: string
}

/** A row as stored in D1. JSON columns are still strings here. */
export type ProjectRow = {
  id: number
  slug: string
  title: string
  category: string
  project_type: string
  status: string
  year: string
  role: string
  headline: string
  short_description: string
  domain: string
  scope: string
  accent: string
  tech_stack: string
  filters: string
  scenes: string
  features: string
  goal: string
  overview: string
  problem: string
  solution: string
  design_approach: string
  development_details: string
  challenges: string
  resolution: string
  result: string
  live_url: string
  live_label: string
  github_url: string
  cover_image: string
  desktop_image: string
  mobile_image: string
  detail_image: string
  featured: number
  sort_order: number
  is_published: number
  created_at: string
  updated_at: string
}

/** A project as the client consumes it: JSON parsed, booleans real. */
export type ProjectDTO = Omit<
  ProjectRow,
  'tech_stack' | 'filters' | 'scenes' | 'features' | 'featured' | 'is_published'
> & {
  techStack: string[]
  filters: string[]
  scenes: { key: string; title: string; text: string }[]
  features: { title: string; text: string }[]
  featured: boolean
  isPublished: boolean
}
