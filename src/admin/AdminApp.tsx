import { useCallback, useEffect, useState } from 'react'
import type { ApiProject } from '../projects-api'
import { Link } from '../router'
import { useRoute } from '../route-state'
import * as api from './api'
import type { AdminStats, AdminUser } from './api'
import { ProjectForm } from './ProjectForm'

const fmtDate = (value: string) => value.replace('T', ' ').slice(0, 16)

export function AdminApp() {
  const { path } = useRoute()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    document.title = 'Admin — B-T-B-N Web'
    api.getSession().then(r => setUser(r.user)).catch(() => setDenied(true))
  }, [])

  if (denied) return <div className="admin-shell"><div className="admin-empty">
    <h1>Хандах эрхгүй</h1>
    <p>Админ хэсэг хамгаалалттай. Зөвшөөрөгдсөн Google хаягаар нэвтэрнэ үү.</p>
    <a href="/api/auth/login" className="admin-button is-primary">Google-ээр нэвтрэх</a>
    <Link href="/" className="admin-button">← Нүүр хуудас</Link>
  </div></div>

  if (!user) return <div className="admin-shell"><div className="admin-empty"><p>Ачаалж байна…</p></div></div>

  const newMatch = path === '/admin/projects/new'
  const editMatch = path.match(/^\/admin\/projects\/(\d+)\/edit$/)

  return <div className="admin-shell">
    <header className="admin-header">
      <div className="admin-brand">
        <Link href="/admin">B-T-B-N <span>Admin</span></Link>
        {user.source === 'local-dev' && <span className="admin-devflag" title="Зөвхөн локал хөгжүүлэлтэд идэвхтэй">LOCAL DEV ADMIN</span>}
      </div>
      <nav className="admin-nav" aria-label="Админ цэс">
        <Link href="/admin" aria-current={path === '/admin' ? 'page' : undefined}>Хяналтын самбар</Link>
        <Link href="/admin/projects" aria-current={path.startsWith('/admin/projects') ? 'page' : undefined}>Төслүүд</Link>
        <Link href="/">Сайт үзэх ↗</Link>
      </nav>
      <div className="admin-user">
        <strong>{user.name}</strong>
        <span>{user.email || user.role}</span>
        {user.source === 'google' && <a href="/api/auth/logout" className="admin-signout">Гарах</a>}
      </div>
    </header>
    <main className="admin-main" id="admin-main">
      {newMatch ? <ProjectForm mode="create" />
        : editMatch ? <ProjectForm mode="edit" id={Number(editMatch[1])} />
        : path === '/admin/projects' ? <ProjectList />
        : <Dashboard />}
    </main>
  </div>
}

function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  useEffect(() => { api.listProjects().then(r => setStats(r.stats)).catch(() => setStats(null)) }, [])
  if (!stats) return <p className="admin-loading">Ачаалж байна…</p>
  const cards = [
    ['Нийт төсөл', stats.total], ['Нийтлэгдсэн', stats.published],
    ['Production', stats.production], ['Concept', stats.concept], ['Онцолсон', stats.featured],
  ] as const
  return <>
    <div className="admin-title"><h1>Хяналтын самбар</h1><Link href="/admin/projects/new" className="admin-button is-primary">+ Шинэ төсөл</Link></div>
    <div className="admin-stats">{cards.map(([label, value]) => <div key={label} className="admin-stat">
      <span className="admin-stat-value">{String(value).padStart(2, '0')}</span><span className="admin-stat-label">{label}</span>
    </div>)}</div>
    <section className="admin-panel">
      <h2>Сүүлд шинэчилсэн</h2>
      {stats.recentlyUpdated.length === 0 ? <p className="admin-muted">Одоогоор төсөл алга.</p> : <ul className="admin-recent">
        {stats.recentlyUpdated.map(p => <li key={p.id}>
          <span>{p.title}</span><code>/work/{p.slug}</code><time>{fmtDate(p.updated_at)}</time>
        </li>)}
      </ul>}
    </section>
  </>
}

function ProjectList() {
  const [projects, setProjects] = useState<ApiProject[] | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api.listProjects().then(r => setProjects(r.projects)).catch(e => setError(e.message))
  }, [])
  useEffect(load, [load])

  const act = async (id: number, action: () => Promise<unknown>) => {
    setBusy(id); setError('')
    try { await action(); load() }
    catch (e) { setError(e instanceof Error ? e.message : 'Алдаа гарлаа.') }
    finally { setBusy(null) }
  }

  if (error && !projects) return <p className="admin-error">{error}</p>
  if (!projects) return <p className="admin-loading">Ачаалж байна…</p>

  return <>
    <div className="admin-title"><h1>Төслүүд <span className="admin-count">{projects.length}</span></h1><Link href="/admin/projects/new" className="admin-button is-primary">+ Шинэ төсөл</Link></div>
    {error && <p className="admin-error" role="alert">{error}</p>}
    <table className="admin-table">
      <thead><tr><th>Дараалал</th><th>Төсөл</th><th>Төрөл</th><th>Төлөв</th><th>Онцолсон</th><th><span className="sr-only">Үйлдэл</span></th></tr></thead>
      <tbody>{projects.map(p => <tr key={p.id} className={busy === p.id ? 'is-busy' : undefined}>
        <td>
          <input type="number" className="admin-order" defaultValue={p.sort_order} min={0} max={100000}
            aria-label={p.title + ' — дараалал'}
            onBlur={e => { const v = Number(e.target.value); if (v !== p.sort_order) act(p.id, () => api.patchProject(p.id, { sortOrder: v })) }} />
        </td>
        <td><strong>{p.title}</strong><code>/work/{p.slug}</code></td>
        <td><span className="admin-tag">{p.project_type}</span></td>
        <td>
          <button type="button" className={'admin-pill ' + (p.isPublished ? 'is-on' : '')} disabled={busy === p.id}
            aria-pressed={p.isPublished}
            onClick={() => act(p.id, () => api.patchProject(p.id, { isPublished: !p.isPublished }))}>
            {p.isPublished ? 'Нийтэлсэн' : 'Ноорог'}
          </button>
        </td>
        <td>
          <button type="button" className={'admin-pill ' + (p.featured ? 'is-on' : '')} disabled={busy === p.id}
            aria-pressed={p.featured} aria-label={p.title + ' — онцолсон'}
            onClick={() => act(p.id, () => api.patchProject(p.id, { featured: !p.featured }))}>
            {p.featured ? '★' : '☆'}
          </button>
        </td>
        <td className="admin-actions">
          <Link href={`/admin/projects/${p.id}/edit`}>Засах</Link>
          <button type="button" className="admin-danger" disabled={busy === p.id} onClick={() => {
            if (confirm(`“${p.title}” төслийг устгах уу? Үүнийг буцаах боломжгүй.`)) act(p.id, () => api.deleteProject(p.id))
          }}>Устгах</button>
        </td>
      </tr>)}</tbody>
    </table>
  </>
}
