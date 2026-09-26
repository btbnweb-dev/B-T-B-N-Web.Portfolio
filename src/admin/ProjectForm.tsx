import { useEffect, useState } from 'react'
import type { ApiProject } from '../projects-api'
import { Link } from '../router'
import { useRoute } from '../route-state'
import * as api from './api'

type Values = Record<string, string | boolean | number>

const EMPTY: Values = {
  title: '', slug: '', category: '', projectType: 'concept', status: 'Concept Project', year: String(new Date().getFullYear()),
  role: '', headline: '', shortDescription: '', domain: '', scope: '', accent: 'citiled',
  techStack: '', filters: '', scenes: '[]', features: '[]',
  goal: '', overview: '', problem: '', solution: '', designApproach: '', developmentDetails: '',
  challenges: '', resolution: '', result: '',
  liveUrl: '', liveLabel: '', githubUrl: '',
  coverImage: '', desktopImage: '', mobileImage: '', detailImage: '',
  featured: false, sortOrder: 0, isPublished: false,
}

const fromApi = (p: ApiProject): Values => ({
  title: p.title, slug: p.slug, category: p.category, projectType: p.project_type, status: p.status,
  year: p.year, role: p.role, headline: p.headline, shortDescription: p.short_description,
  domain: p.domain, scope: p.scope, accent: p.accent,
  techStack: p.techStack.join(', '), filters: p.filters.join(', '),
  scenes: JSON.stringify(p.scenes, null, 2), features: JSON.stringify(p.features, null, 2),
  goal: p.goal, overview: p.overview, problem: p.problem, solution: p.solution,
  designApproach: p.design_approach, developmentDetails: p.development_details,
  challenges: p.challenges, resolution: p.resolution, result: p.result,
  liveUrl: p.live_url, liveLabel: p.live_label, githubUrl: p.github_url,
  coverImage: p.cover_image, desktopImage: p.desktop_image, mobileImage: p.mobile_image, detailImage: p.detail_image,
  featured: p.featured, sortOrder: p.sort_order, isPublished: p.isPublished,
})

export function ProjectForm({ mode, id }: { mode: 'create' | 'edit'; id?: number }) {
  const { navigate } = useRoute()
  const [values, setValues] = useState<Values>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [state, setState] = useState<'idle' | 'loading' | 'saving'>(mode === 'edit' ? 'loading' : 'idle')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (mode !== 'edit' || !id) return
    api.getProject(id)
      .then(r => { setValues(fromApi(r.project)); setState('idle') })
      .catch(e => { setMessage(e.message); setState('idle') })
  }, [mode, id])

  const set = (key: string, value: string | boolean | number) => {
    setValues(v => ({ ...v, [key]: value }))
    setErrors(e => ({ ...e, [key]: '' }))
  }

  // Suggest a slug from the title while creating, until the slug is edited by hand.
  const [slugTouched, setSlugTouched] = useState(false)
  const onTitle = (value: string) => {
    set('title', value)
    if (mode === 'create' && !slugTouched) {
      set('slug', value.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 80))
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (state === 'saving') return
    setState('saving'); setErrors({}); setMessage('')
    try {
      const saved = mode === 'create' ? await api.createProject(values) : await api.updateProject(id!, values)
      setMessage('Хадгаллаа ✓')
      navigate('/admin/projects')
      return saved
    } catch (e) {
      if (e instanceof api.ApiError) {
        setErrors(e.errors)
        setMessage(Object.keys(e.errors).length ? 'Маягтад алдаа байна.' : e.message)
      } else setMessage('Хадгалахад алдаа гарлаа.')
    } finally { setState('idle') }
  }

  if (state === 'loading') return <p className="admin-loading">Ачаалж байна…</p>
  const busy = state === 'saving'

  const field = (key: string, label: string, opts: { type?: string; rows?: number; hint?: string; required?: boolean } = {}) => (
    <div className={'admin-field' + (opts.rows ? ' is-wide' : '')}>
      <label htmlFor={'f-' + key}>{label}{opts.required && ' *'}</label>
      {opts.rows
        ? <textarea id={'f-' + key} rows={opts.rows} value={String(values[key] ?? '')} disabled={busy}
            aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? key + '-err' : undefined}
            onChange={e => set(key, e.target.value)} />
        : <input id={'f-' + key} type={opts.type || 'text'} value={String(values[key] ?? '')} disabled={busy}
            aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? key + '-err' : undefined}
            onChange={e => key === 'title' ? onTitle(e.target.value) : set(key, e.target.value)}
            onBlur={key === 'slug' ? () => setSlugTouched(true) : undefined} />}
      {opts.hint && !errors[key] && <small>{opts.hint}</small>}
      {errors[key] && <span className="admin-fielderror" id={key + '-err'}>{errors[key]}</span>}
    </div>
  )

  return <form className="admin-form" onSubmit={submit} noValidate>
    <div className="admin-title">
      <h1>{mode === 'create' ? 'Шинэ төсөл' : 'Төсөл засах'}</h1>
      <Link href="/admin/projects" className="admin-button">← Буцах</Link>
    </div>
    {message && <p className={'admin-message ' + (Object.keys(errors).length ? 'is-error' : '')} role="alert">{message}</p>}

    <fieldset><legend>Үндсэн мэдээлэл</legend><div className="admin-grid">
      {field('title', 'Гарчиг', { required: true })}
      {field('slug', 'Slug', { required: true, hint: 'Нийтийн хаяг: /work/<slug>' })}
      {field('category', 'Ангилал', { required: true, hint: 'Ж: Production Web System' })}
      <div className="admin-field">
        <label htmlFor="f-projectType">Төслийн төрөл</label>
        <select id="f-projectType" value={String(values.projectType)} disabled={busy} onChange={e => set('projectType', e.target.value)}>
          <option value="production">production</option><option value="fullstack">fullstack</option>
          <option value="landing">landing</option><option value="concept">concept</option>
        </select>
        {errors.projectType && <span className="admin-fielderror">{errors.projectType}</span>}
      </div>
      {field('status', 'Төлөв', { hint: 'Ж: Production, Concept Project' })}
      {field('year', 'Он', { hint: '4 оронтой' })}
      {field('role', 'Үүрэг')}
      <div className="admin-field">
        <label htmlFor="f-accent">Өнгө</label>
        <select id="f-accent" value={String(values.accent)} disabled={busy} onChange={e => set('accent', e.target.value)}>
          {['citiled', 'gaming', 'coffee', 'beauty', 'build'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      {field('headline', 'Headline', { rows: 2 })}
      {field('shortDescription', 'Товч тайлбар', { rows: 3 })}
      {field('domain', 'Салбар')}
      {field('scope', 'Хамрах хүрээ')}
      {field('techStack', 'Технологи', { hint: 'Таслалаар тусгаарлана: React, TypeScript' })}
      {field('filters', 'Шүүлтүүр', { hint: 'Таслалаар: Production, Full-stack' })}
    </div></fieldset>

    <fieldset><legend>Холбоос ба зураг</legend><div className="admin-grid">
      {field('liveUrl', 'Live URL', { type: 'url', hint: 'https://…' })}
      {field('liveLabel', 'Live шошго', { hint: 'Хоосон бол домэйн автоматаар' })}
      {field('githubUrl', 'GitHub URL', { type: 'url', hint: 'https://github.com/…' })}
      {field('coverImage', 'Cover зураг', { hint: '/previews/… эсвэл https://… (дараа R2)' })}
      {field('desktopImage', 'Desktop зураг')}
      {field('mobileImage', 'Mobile зураг')}
      {field('detailImage', 'Detail зураг')}
    </div></fieldset>

    <fieldset><legend>Кейс судалгаа <small>(заавал биш)</small></legend><div className="admin-grid">
      {field('goal', 'Зорилго', { rows: 3 })}
      {field('overview', 'Тойм', { rows: 4 })}
      {field('problem', 'Асуудал', { rows: 4 })}
      {field('solution', 'Шийдэл', { rows: 4 })}
      {field('designApproach', 'Дизайны хандлага', { rows: 4 })}
      {field('developmentDetails', 'Хөгжүүлэлт', { rows: 4 })}
      {field('challenges', 'Сорилт', { rows: 3 })}
      {field('resolution', 'Шийдвэрлэсэн нь', { rows: 3 })}
      {field('result', 'Үр дүн', { rows: 3 })}
      {field('scenes', 'Scenes (JSON)', { rows: 5, hint: '[{"key":"01","title":"…","text":"…"}]' })}
      {field('features', 'Features (JSON)', { rows: 5, hint: '[{"title":"…","text":"…"}]' })}
    </div></fieldset>

    <fieldset><legend>Нийтлэл</legend><div className="admin-grid">
      {field('sortOrder', 'Дараалал', { type: 'number' })}
      <div className="admin-field admin-checks">
        <label><input type="checkbox" checked={Boolean(values.featured)} disabled={busy} onChange={e => set('featured', e.target.checked)} /> Онцолсон (Featured)</label>
        <label><input type="checkbox" checked={Boolean(values.isPublished)} disabled={busy} onChange={e => set('isPublished', e.target.checked)} /> Нийтлэх</label>
      </div>
    </div></fieldset>

    <div className="admin-formbottom">
      <button type="submit" className="admin-button is-primary" disabled={busy}>{busy ? 'Хадгалж байна…' : 'Хадгалах'}</button>
      <Link href="/admin/projects" className="admin-button">Цуцлах</Link>
    </div>
  </form>
}
