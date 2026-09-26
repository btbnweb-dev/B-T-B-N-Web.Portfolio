import type { Project } from './data'

/** Project as returned by the Worker API (snake_case columns, parsed JSON). */
export type ApiProject = {
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
  techStack: string[]
  filters: string[]
  scenes: { key: string; title: string; text: string }[]
  features: { title: string; text: string }[]
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
  featured: boolean
  sort_order: number
  isPublished: boolean
  created_at: string
  updated_at: string
}

/**
 * Adapts a database row to the `Project` shape the existing UI renders, so the
 * public components did not need rewriting when the data source changed.
 */
export function toProject(api: ApiProject, index: number): Project {
  return {
    id: api.slug,
    number: String(index + 1).padStart(2, '0'),
    name: api.title,
    category: api.category,
    status: api.status,
    year: api.year,
    // `featured` alone cannot express the three tiers: production work and the flagship
    // scroll concepts are both featured, but only the former is real client/production
    // work. `project_type` already separates them, so derive the tier from that.
    // Three tiers from two columns: unfeatured rows are always the small concept grid;
    // among featured rows, real production/full-stack work is `major` and the featured
    // concept experiments are `flagship`.
    tier: !api.featured
      ? 'concept'
      : (api.project_type === 'production' || api.project_type === 'fullstack') ? 'major' : 'flagship',
    description: api.short_description,
    headline: api.headline,
    role: api.role,
    tech: api.techStack,
    filters: api.filters,
    image: api.desktop_image || api.cover_image,
    mobile: api.mobile_image,
    detail: api.detail_image || api.desktop_image || api.cover_image,
    href: api.live_url || undefined,
    liveLabel: api.live_label || undefined,
    githubUrl: api.github_url || undefined,
    accent: api.accent,
    domain: api.domain,
    scope: api.scope,
    overview: api.overview,
    problem: api.problem,
    solution: api.solution,
    design: api.design_approach,
    development: api.development_details,
    scenes: api.scenes,
    features: api.features,
    challenge: api.challenges,
    resolution: api.resolution,
    result: api.result,
  }
}

export async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/projects', { headers: { accept: 'application/json' } })
  if (!response.ok) throw new Error('Төслүүдийг ачаалж чадсангүй.')
  const data = await response.json() as { projects: ApiProject[] }
  return data.projects.map(toProject)
}
