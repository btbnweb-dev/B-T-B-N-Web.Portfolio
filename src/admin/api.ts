import type { ApiProject } from '../projects-api'

export type AdminUser = { name: string; role: string; email?: string; source: string }
export type AdminStats = {
  total: number; published: number; production: number; concept: number; featured: number
  recentlyUpdated: { id: number; slug: string; title: string; updated_at: string }[]
}

export class ApiError extends Error {
  status: number
  errors: Record<string, string>
  constructor(message: string, status: number, errors: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    // Same-origin only: the admin session cookie must travel, and the request must never
    // be sent cross-site. The Worker independently checks Origin on every mutation.
    credentials: 'same-origin',
    mode: 'same-origin',
    headers: { accept: 'application/json', ...(init.body ? { 'content-type': 'application/json' } : {}), ...init.headers },
  })
  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    throw new ApiError(
      (data.error as string) || 'Хүсэлт амжилтгүй боллоо.',
      response.status,
      (data.errors as Record<string, string>) || {},
    )
  }
  return data as T
}

export const getSession = () => request<{ user: AdminUser }>('/api/admin/session')
export const listProjects = () => request<{ projects: ApiProject[]; stats: AdminStats }>('/api/admin/projects')
export const getProject = (id: number) => request<{ project: ApiProject }>(`/api/admin/projects/${id}`)
export const createProject = (body: unknown) =>
  request<{ project: ApiProject }>('/api/admin/projects', { method: 'POST', body: JSON.stringify(body) })
export const updateProject = (id: number, body: unknown) =>
  request<{ project: ApiProject }>(`/api/admin/projects/${id}`, { method: 'PUT', body: JSON.stringify(body) })
export const patchProject = (id: number, body: unknown) =>
  request<{ project: ApiProject }>(`/api/admin/projects/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
export const deleteProject = (id: number) =>
  request<{ deleted: number }>(`/api/admin/projects/${id}`, { method: 'DELETE' })
