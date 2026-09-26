import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { contact, navigation, projectTypes } from './data'
import { Mark } from './Mark'
import type { Project } from './data'
import { reduced, useParallax } from './motion'
import { Link } from './router'
import { useRoute } from './route-state'

export function Arrow({ down = false }: { down?: boolean }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" style={down ? { transform: 'rotate(135deg)' } : undefined}><path d="M5 19 19 5M5 5h14v14" /></svg> }
export function Logo() { return <Link className="logo" href="/" aria-label="B-T-B-N Web — Нүүр"><Mark className="logo-mark" /><span>B-T-B-N<span className="logo-web"> Web</span></span></Link> }
export function Button({ children, href, secondary = false }: { children: ReactNode; href: string; secondary?: boolean }) {
  return <Link className={'button ' + (secondary ? 'button-secondary' : '')} href={href}>{children}<Arrow /></Link>
}
export function Label({ children, number }: { children: ReactNode; number?: string }) { return <p className="eyebrow">{number && <span>{number} /</span>}{children}</p> }

/** Splits a heading into lines that rise into view, one after another. */
export function Lines({ lines }: { lines: string[] }) {
  return <>{lines.map((line, i) => <span className="line" key={i}><span>{line}</span></span>)}</>
}

/** Fade-and-rise on first entry. `clip` switches to a masked wipe for large media. */
export function Reveal({ children, className = '', clip = false }: { children: ReactNode; className?: string; clip?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current!
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    if (!media.matches && el.getBoundingClientRect().top > innerHeight) el.classList.add('is-pending')
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { el.classList.remove('is-pending'); observer.disconnect() } }, { threshold: .04 })
    observer.observe(el)
    const change = () => { if (media.matches) el.classList.remove('is-pending') }
    media.addEventListener('change', change)
    return () => { observer.disconnect(); media.removeEventListener('change', change) }
  }, [])
  return <div ref={ref} className={(clip ? 'clip-reveal ' : 'reveal ') + className}>{children}</div>
}

export function Navbar() {
  const { path } = useRoute()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const toggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const scroll = () => setScrolled(scrollY > 24)
    const media = matchMedia('(min-width: 900px)')
    const resize = () => { if (media.matches) setOpen(false) }
    scroll(); window.addEventListener('scroll', scroll, { passive: true }); media.addEventListener('change', resize)
    return () => { window.removeEventListener('scroll', scroll); media.removeEventListener('change', resize) }
  }, [])
  useEffect(() => {
    if (!open) return
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() } }
    const outside = (event: PointerEvent) => { if (!(event.target as Element).closest('.site-header')) setOpen(false) }
    document.addEventListener('keydown', escape); document.addEventListener('pointerdown', outside)
    return () => { document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside) }
  }, [open])
  const active = (href: string) => path === href || path.startsWith(href + '/')
  return <header className={'site-header' + (scrolled ? ' is-scrolled' : '') + (open ? ' is-open' : '')}>
    <div className="wrap nav-inner"><Logo /><nav className="desktop-nav" aria-label="Үндсэн цэс">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined}>{item.label}</Link>)}</nav>
    <div className="nav-actions"><span className="nav-location">УБ, МОНГОЛ</span><Link href="/contact" className="nav-cta" onClick={() => setOpen(false)}>Төсөл эхлүүлэх<Arrow /></Link><button type="button" className="menu-toggle" ref={toggle} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Цэс хаах' : 'Цэс нээх'} onClick={() => setOpen(!open)}>{open ? '✕' : '☰'}</button></div></div>
    <nav id="mobile-nav" className="mobile-nav" aria-label="Гар утасны цэс" hidden={!open}>{navigation.map((item, i) => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined} onClick={() => setOpen(false)}><span>0{i + 1}</span>{item.label}<Arrow /></Link>)}</nav>
  </header>
}

/** Browser-chrome frame around a project screenshot. */
export function ProjectVisual({ project, priority = false, src, parallax = false }: { project: Project; priority?: boolean; src?: string; parallax?: boolean }) {
  const ref = useParallax(parallax ? 22 : 0)
  const imageSrc = src || project.image
  return <div className={'project-visual visual-' + project.accent}>
    <div className="visual-topline" aria-hidden="true">
      <span className="dot-row"><i /><i /><i /></span>
      <span className="visual-url">{project.liveLabel || project.name}</span>
      {project.href && <span className="visual-live"><i />LIVE</span>}
    </div>
    <div className="project-frame">{imageSrc && <img ref={parallax ? ref as never : undefined} data-parallax={parallax ? '' : undefined} src={imageSrc} width="1440" height="1000" alt={project.name + ' — вэб сайтын дэлгэцийн зураг'} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" />}</div>
  </div>
}

/** Major projects: full-width frame, large title, metadata row, live + case links. */
export function FeatureProject({ project, index }: { project: Project; index: number }) {
  return <Reveal className="feature-project">
    <div className="feature-head">
      <div className="feature-title">
        <span className="feature-index">{project.number}</span>
        <h3>{project.name}</h3>
      </div>
      <span className={'status-pill ' + (project.status.includes('Production') || project.status.includes('Live') ? 'is-live' : '')}>
        {(project.status.includes('Production') || project.status.includes('Live')) && <i />}{project.category}
      </span>
    </div>
    <Link href={'/work/' + project.id} className="project-link" data-cursor="Үзэх" aria-label={project.name + ' — кейс судалгаа үзэх'}>
      <ProjectVisual project={project} priority={index === 0} parallax />
    </Link>
    <div className="feature-body">
      <p>{project.description}</p>
      <dl className="feature-meta">
        <div><dt>Салбар</dt><dd>{project.domain}</dd></div>
        <div><dt>Үүрэг</dt><dd>{project.role}</dd></div>
        <div><dt>Технологи</dt><dd>{project.tech.slice(0, 3).join(', ')}</dd></div>
        <div><dt>Он</dt><dd>{project.year}</dd></div>
      </dl>
    </div>
    <div className="feature-actions">
      <Link href={'/work/' + project.id} className="case-link">Кейс судалгаа<Arrow /></Link>
      {project.href && <a className="live-link" href={project.href} target="_blank" rel="noopener noreferrer" aria-label={project.name + ' live site үзэх — шинэ цонхонд нээгдэнэ'}>Live Site<Arrow /></a>}
    </div>
  </Reveal>
}

/** Concept projects: smaller card, lighter weight. */
export function ConceptCard({ project }: { project: Project }) {
  return <Reveal className="concept-card">
    <Link href={'/work/' + project.id} className="project-link" data-cursor="Үзэх" aria-label={project.name + ' — кейс судалгаа үзэх'}>
      <ProjectVisual project={project} />
      <div className="project-info">
        <h3>{project.name}<Arrow /></h3>
        <p>{project.description}</p>
      </div>
    </Link>
    <div className="concept-meta">
      <span className="status-pill is-concept">Concept Project</span>
      <span className="concept-tags">{project.tech.slice(0, 3).map(tech => <span key={tech}>{tech}</span>)}</span>
    </div>
    <div className="concept-actions">
      <Link href={'/work/' + project.id} className="case-link">Кейс судалгаа<Arrow /></Link>
      {project.href && <a className="live-link" href={project.href} target="_blank" rel="noopener noreferrer" aria-label={project.name + ' live site үзэх — шинэ цонхонд нээгдэнэ'}>Live Site<Arrow /></a>}
    </div>
  </Reveal>
}

/** Desktop-only cursor label over large project links. */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null)
  const [label, setLabel] = useState('Үзэх')
  useEffect(() => {
    const media = matchMedia('(pointer: fine) and (hover: hover) and (prefers-reduced-motion: no-preference)')
    let frame = 0, x = 0, y = 0
    const render = () => { frame = 0; const el = ref.current; if (el) el.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)' }
    const move = (event: PointerEvent) => {
      const el = ref.current
      if (!el) return
      const target = media.matches ? (event.target as Element).closest('[data-cursor]') : null
      if (target) { const next = target.getAttribute('data-cursor'); if (next) setLabel(next) }
      el.classList.toggle('is-active', Boolean(target))
      x = event.clientX; y = event.clientY
      if (!frame) frame = requestAnimationFrame(render)
    }
    const hide = () => ref.current?.classList.remove('is-active')
    window.addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerleave', hide); window.addEventListener('blur', hide); media.addEventListener('change', hide)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', hide); window.removeEventListener('blur', hide); media.removeEventListener('change', hide) }
  }, [])
  return <div ref={ref} className="project-cursor" aria-hidden="true">{label}</div>
}

/** Subtle magnetic pull on the closing call to action. */
export function Cta() {
  const circle = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = circle.current
    if (!el || reduced() || !matchMedia('(pointer: fine) and (hover: hover)').matches) return
    const link = el.closest('.cta-link') as HTMLElement | null
    if (!link) return
    let frame = 0
    const move = (event: PointerEvent) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const box = el.getBoundingClientRect()
        const dx = event.clientX - (box.left + box.width / 2), dy = event.clientY - (box.top + box.height / 2)
        const distance = Math.hypot(dx, dy)
        const pull = distance < 260 ? Math.min(1, (260 - distance) / 260) * .28 : 0
        el.style.transform = 'translate3d(' + (dx * pull).toFixed(1) + 'px,' + (dy * pull).toFixed(1) + 'px,0)'
      })
    }
    const reset = () => { cancelAnimationFrame(frame); frame = 0; el.style.transform = '' }
    link.addEventListener('pointermove', move); link.addEventListener('pointerleave', reset)
    return () => { cancelAnimationFrame(frame); link.removeEventListener('pointermove', move); link.removeEventListener('pointerleave', reset) }
  }, [])
  return <section className="cta wrap"><Label>ДАРААГИЙН ТӨСӨЛ / ХАМТДАА</Label>
    <Link href="/contact" className="cta-link" data-cursor="Бичих"><span>Төслөө<br /><em>эхлүүлье.</em></span><span className="cta-circle" ref={circle}><Arrow /></span></Link>
    <div className="cta-bottom"><span>Юу хийхээ товч бичихэд хангалттай.</span><span className="availability"><i />Шинэ төсөлд нээлттэй</span></div>
  </section>
}

export function Footer() {
  return <footer className="footer wrap">
    <div><Logo /><p>Батбаясгалан · Web Developer · Улаанбаатар</p></div>
    <nav aria-label="Хуудасны доод цэс">{navigation.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
    <nav className="footer-social" aria-label="Албан ёсны сувгууд">
      <a href={'mailto:' + contact.email}>{contact.email}</a>
      {contact.socials.map(item => <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">{item.label}<span className="sr-only"> — шинэ цонхонд нээгдэнэ</span></a>)}
    </nav>
    <span>© {new Date().getFullYear()} B-T-B-N Web</span>
  </footer>
}

type Values = { name: string; email: string; phone: string; company: string; type: string; budget: string; message: string }
type Field = keyof Values
const initial: Values = { name: '', email: '', phone: '', company: '', type: '', budget: '', message: '' }
/**
 * Formspree endpoint. The form id is public by design — Formspree expects it in client
 * code and restricts submissions to the domains allowed in its dashboard, so this is not
 * a secret. It is read from an env var so it can differ per environment and is never
 * committed; see `.env.example`. With no id configured the form validates but does not
 * send, and says so, rather than silently dropping an enquiry.
 */
const FORM_ENDPOINT = import.meta.env.VITE_FORMSPREE_ID ? 'https://formspree.io/f/' + import.meta.env.VITE_FORMSPREE_ID : ''

export function ContactForm() {
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({})
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle')
  const [trap, setTrap] = useState('')
  const ref = useRef<HTMLFormElement>(null)
  const update = (field: Field, value: string) => {
    setValues(previous => ({ ...previous, [field]: value }))
    setErrors(previous => ({ ...previous, [field]: undefined }))
    setState(previous => (previous === 'idle' || previous === 'sending' ? previous : 'idle'))
  }
  const props = (field: Field) => ({ id: 'contact-' + field, name: field, value: values[field], disabled: state === 'sending', 'aria-invalid': Boolean(errors[field]), 'aria-describedby': errors[field] ? field + '-error' : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => update(field, event.target.value) })
  const error = (field: Field) => errors[field] ? <span className="field-error" id={field + '-error'}>{errors[field]}</span> : null
  const reset = () => { setValues(initial); setErrors({}); setState('idle'); setTrap(''); ref.current?.querySelector<HTMLInputElement>('#contact-name')?.focus() }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (state === 'sending') return                       // guard against double submits
    const next: Partial<Record<Field, string>> = {}
    if (!values.name.trim()) next.name = 'Нэрээ оруулна уу.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) next.email = 'Зөв и-мэйл хаяг оруулна уу.'
    if (values.phone.trim() && !/^(?:\+976)?\d{8}$/.test(values.phone.replace(/[\s()-]/g, ''))) next.phone = '8 оронтой утасны дугаар оруулна уу.'
    if (!projectTypes.some(item => item.value === values.type)) next.type = 'Төслийн төрлөө сонгоно уу.'
    if (!values.message.trim()) next.message = 'Төслийнхөө тухай товч бичнэ үү.'
    setErrors(next)
    if (Object.keys(next).length) { setState('idle'); ref.current?.querySelector<HTMLElement>('#contact-' + Object.keys(next)[0])?.focus(); return }
    if (trap) { setState('sent'); return }                // honeypot filled → silently accept, never send
    if (!FORM_ENDPOINT) { setState('failed'); return }

    setState('sending')
    const typeLabel = projectTypes.find(item => item.value === values.type)?.label ?? values.type
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          _subject: 'B-T-B-N Web — Шинэ төсөл: ' + typeLabel,
          _replyto: values.email.trim(),
          email: values.email.trim(),
          'Нэр': values.name.trim(),
          'И-мэйл': values.email.trim(),
          'Утас': values.phone.trim() || '—',
          'Компанийн нэр': values.company.trim() || '—',
          'Төслийн төрөл': typeLabel,
          'Төсөв': values.budget || 'Ярилцаж шийдье',
          'Төслийн тухай': values.message.trim(),
        }),
      })
      setState(response.ok ? 'sent' : 'failed')
    } catch { setState('failed') }
  }

  const sending = state === 'sending'
  return <form ref={ref} noValidate className="contact-form" onSubmit={submit}>
    <div className="form-title"><span>01 / ТӨСЛИЙН МЭДЭЭЛЭЛ</span><span>* Заавал бөглөнө</span></div>
    <div className="form-grid">
      <div className="field"><label htmlFor="contact-name">Нэр *</label><input {...props('name')} autoComplete="name" required maxLength={100} placeholder="Таны нэр" />{error('name')}</div>
      <div className="field"><label htmlFor="contact-email">И-мэйл *</label><input {...props('email')} type="email" autoComplete="email" required maxLength={150} placeholder="name@example.com" />{error('email')}</div>
      <div className="field"><label htmlFor="contact-phone">Утас <small>Заавал биш</small></label><input {...props('phone')} type="tel" autoComplete="tel" maxLength={20} placeholder="9911 2233" />{error('phone')}</div>
      <div className="field"><label htmlFor="contact-company">Компанийн нэр <small>Заавал биш</small></label><input {...props('company')} autoComplete="organization" maxLength={150} placeholder="Компани / брэнд" /></div>
      <div className="field"><label htmlFor="contact-type">Төслийн төрөл *</label><select {...props('type')} required><option value="">Сонгох</option>{projectTypes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>{error('type')}</div>
      <div className="field"><label htmlFor="contact-budget">Төсөв <small>Заавал биш</small></label><select {...props('budget')}><option value="">Ярилцаж шийдье</option><option>1 сая ₮ хүртэл</option><option>1–3 сая ₮</option><option>3–5 сая ₮</option><option>5 сая ₮-өөс дээш</option></select></div>
      <div className="field field-wide"><label htmlFor="contact-message">Төслийн тухай *</label><textarea {...props('message')} rows={5} required maxLength={3000} placeholder="Юу бүтээхийг хүсэж байна? Гол зорилго, хэрэгтэй боломжууд, хугацаагаа бичээрэй." />{error('message')}</div>
    </div>
    {/* Honeypot: hidden from people and assistive tech, but bots fill it in. */}
    <div className="honeypot" aria-hidden="true"><label htmlFor="contact-website">Вэб хаяг</label><input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={event => setTrap(event.target.value)} /></div>
    <div className="form-bottom">
      <button type="submit" className="button" disabled={sending} aria-busy={sending}>{sending ? 'Илгээж байна…' : 'Хүсэлт илгээх'}{sending ? <span className="spinner" aria-hidden="true" /> : <Arrow />}</button>
      <p>Хүсэлт {contact.email} руу очно.<br />Хариуг ажлын 1–2 өдөрт өгнө.</p>
    </div>
    <div role="status" aria-live="polite" className="form-status">
      {state === 'sent' && <div className="success">
        <strong>Хүсэлт илгээгдлээ ✓</strong>
        <p>Баярлалаа. Ажлын 1–2 өдөрт хариу бичнэ.</p>
        <button type="button" onClick={reset}>Дахин бөглөх ↗</button>
      </div>}
      {state === 'failed' && <div className="failure">
        <strong>Илгээхэд алдаа гарлаа</strong>
        <p>Сүлжээний алдаа гарсан байж болзошгүй. Дахин оролдох эсвэл шууд <a href={'mailto:' + contact.email}>{contact.email}</a> руу бичээрэй.</p>
        <button type="button" onClick={() => setState('idle')}>Дахин оролдох ↗</button>
      </div>}
    </div>
  </form>
}
/**
 * Official channels. Email opens a mail client; social profiles open in a new tab.
 * Anything still listed in `contact.pending` is shown as plain text, never as a link.
 */
export function DirectContact({ compact = false }: { compact?: boolean }) {
  const rows = [
    contact.email ? { key: 'Email', label: contact.email, href: 'mailto:' + contact.email, external: false } : null,
    contact.phone ? { key: 'Утас', label: contact.phone, href: 'tel:' + contact.phone.replace(/\s/g, ''), external: false } : null,
    ...contact.socials.map(item => ({ key: item.label, label: socialHandle(item), href: item.href, external: true })),
  ].filter(Boolean) as { key: string; label: string; href: string; external: boolean }[]
  const pending = contact.pending ?? []
  if (!rows.length && !pending.length) return null
  return <div className={'direct-contact' + (compact ? ' is-compact' : '')}>
    {rows.map(row => <a key={row.href} href={row.href} className="channel"
      {...(row.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
      <span className="channel-key mono">{row.key}</span>
      <span className="channel-value">{row.label}</span>
      <span className="channel-arrow" aria-hidden="true">↗</span>
      {row.external && <span className="sr-only"> — шинэ цонхонд нээгдэнэ</span>}
    </a>)}
    {pending.length > 0 && <p className="channel-pending"><span className="mono">{pending.join(' · ')}</span>Эдгээр суваг бэлтгэгдэж байна.</p>}
  </div>
}
/** Shows a readable handle instead of a long profile URL. */
function socialHandle(item: { label: string; href: string }) {
  if (item.label === 'Instagram') return '@btbn_web'
  if (item.label === 'GitHub') return 'btbnweb-dev'
  if (item.label === 'Facebook') return 'B-T-B-N Web'
  return item.label
}
