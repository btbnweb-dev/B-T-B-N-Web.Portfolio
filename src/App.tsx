import { useEffect, useRef, useState } from 'react'
import { Arrow, Button, ConceptCard, ContactForm, Cta, Cursor, DirectContact, FeatureProject, Footer, Label, Lines, Navbar, ProjectVisual, Reveal } from './components'
import { Mark } from './Mark'
import { useParallax } from './motion'
import { navigation, process, projects as fallbackProjects, services, stack } from './data'
import type { Project } from './data'
import { fetchProjects } from './projects-api'
import { ProjectsContext, useProjects } from './projects-state'
import { AdminApp } from './admin/AdminApp'
import { Link, Router } from './router'
import { useRoute } from './route-state'

/** Rotating technical mark behind the hero — pure SVG, transform-only animation. */
function HeroMark() {
  return <div className="hero-mark" aria-hidden="true"><svg viewBox="0 0 200 200">
    <circle className="m-ring" cx="100" cy="100" r="86" />
    <circle className="m-ring two" cx="100" cy="100" r="62" />
    <g className="m-grid"><line x1="14" y1="100" x2="186" y2="100" /><line x1="100" y1="14" x2="100" y2="186" /></g>
    <circle className="m-arc" cx="100" cy="100" r="86" strokeDasharray="70 470" />
    <circle className="m-arc" cx="100" cy="100" r="62" strokeDasharray="34 356" style={{ animationDuration: '32s', animationDirection: 'reverse' }} />
    <g className="m-dot"><circle cx="186" cy="100" r="3.4" /></g>
    <circle cx="100" cy="100" r="2.6" fill="var(--accent)" />
  </svg></div>
}

function Home() {
  const { projects } = useProjects()
  const major = projects.filter(p => p.tier === 'major')
  // Concept work whose interaction is the point. Shown at feature weight so the scroll
  // experiments read as substantial, but under their own heading so nothing implies
  // they were paid client work.
  const flagship = projects.filter(p => p.tier === 'flagship')
  const concepts = projects.filter(p => p.tier === 'concept')
  return <>
    <section className="hero wrap">
      <div className="hero-field" aria-hidden="true" />
      <HeroMark />
      <div className="hero-top"><span className="availability"><i />Шинэ төсөлд нээлттэй</span><span className="mono">INDEPENDENT WEB DEVELOPER · 2026</span></div>
      <div className="hero-main">
        <h1><Lines lines={['Бизнест хэрэгтэй', 'вэбийг эхнээс']} /><span className="line"><span>нь бүтээнэ<span className="hero-period">.</span></span></span></h1>
        <div className="hero-lower">
          <div className="hero-copy">
            <p>Landing page-ээс өгөгдөл, админ самбартай full-stack систем хүртэл хөгжүүлнэ. Дизайн, код, production-д гаргах ажлаа надтай шууд ярилцана.</p>
            <div className="hero-actions"><Button href="/work">Ажлууд үзэх</Button><Button href="/contact" secondary>Төсөл эхлүүлэх</Button></div>
          </div>
          <div className="hero-stats">
            <div><div className="stat-value">08</div><span className="stat-key">Төсөл</span></div>
            <div><div className="stat-value">02</div><span className="stat-key">Production</span></div>
            <div><div className="stat-value">MN</div><span className="stat-key">Улаанбаатар</span></div>
          </div>
        </div>
      </div>
      <div className="hero-bottom">
        <span className="tick">React <b>/</b> TypeScript <b>/</b> Next.js <b>/</b> PostgreSQL <b>/</b> Cloudflare</span>
        <a href="#selected-work">СОНГОСОН АЖЛУУД <Arrow down /></a>
      </div>
    </section>

    <section className="selected-work wrap section-space" id="selected-work">
      <Reveal className="section-heading">
        <div><Label number="01">СОНГОСОН АЖЛУУД</Label><h2>Бодит систем, <span className="muted">туршсан санаанууд.</span></h2></div>
        <div className="heading-aside"><p>Production-д ажиллаж буй систем, дипломын платформ, дизайны туршилтууд.</p><Link className="text-link" href="/work">Бүх ажлууд <span>08</span><Arrow /></Link></div>
      </Reveal>
      <div className="featured-list">{major.map((project, i) => <FeatureProject key={project.id} project={project} index={i} />)}</div>

      <div className="concept-heading is-flagship"><Label>SCROLL EXPERIMENTS · CONCEPT</Label><p>Scroll нь 3D загвар, кадрын дараалал, бүхэл бүтэн танилцуулгыг удирдах туршилтууд.</p></div>
      <div className="featured-list">{flagship.map((project, i) => <FeatureProject key={project.id} project={project} index={major.length + i} />)}</div>

      <div className="concept-heading"><Label>CONCEPT PROJECTS</Label><p>Жижиг хүрээ. Өөр өөр өнгө төрх.</p></div>
      <div className="concept-grid">{concepts.map(project => <ConceptCard key={project.id} project={project} />)}</div>
    </section>

    <section className="home-services section-space"><div className="wrap expertise-grid">
      <Reveal><Label number="02">ЮУ БҮТЭЭХ ВЭ?</Label><h2>Дизайн, хөгжүүлэлт, нэвтрүүлэлт — <em>нэг урсгалаар.</em></h2><p className="section-note">Төслийн хэмжээ, хугацаа, цаашид арчлах боломжид тохируулж хүрээгээ тогтооно.</p><Link className="text-link" href="/services">Үйлчилгээтэй танилцах<Arrow /></Link></Reveal>
      <div className="expertise-list">{services.slice(0, 3).map((service, index) => <Link key={service.title} href="/services"><span className="mono">0{index + 1}</span><div><h3>{service.title}</h3><p>{service.subtitle}</p></div><Arrow /></Link>)}</div>
    </div></section>

    <section className="home-about wrap section-space"><Label number="03">ХӨГЖҮҮЛЭГЧИЙН ТУХАЙ</Label>
      <Reveal className="home-about-grid">
        <p className="statement">Би <span>Батбаясгалан.</span> Хэрэглэхэд хялбар, цааш хөгжүүлэхэд цэгцтэй вэб бүтээнэ.</p>
        <div><p>Дизайн, frontend, өгөгдөл, deployment-ийг өөрөө хариуцна. Зорилго, хэрэгтэй боломжуудаа надтай шууд ярилцаад шийднэ.</p><Link className="text-link" href="/about">Миний арга барил<Arrow /></Link></div>
      </Reveal>
    </section><Cta />
  </>
}

function PageIntro({ index, label, lines, description }: { index: string; label: string; lines: string[]; description: string }) {
  return <div className="page-intro wrap"><Label number={index}>{label}</Label><div className="page-intro-grid"><h1><Lines lines={lines} /></h1><p>{description}</p></div></div>
}

const filters = ['Бүгд', 'Production', 'Full-stack', 'Landing Page', 'Concept']
function Work() {
  const { projects } = useProjects()
  const [filter, setFilter] = useState('Бүгд')
  const visible = projects.filter(project => filter === 'Бүгд' || project.filters.includes(filter))
  return <><PageIntro index="01" label="WORK / 2026" lines={['Бүтээсэн ажлууд.']} description="Production-д ажиллаж буй систем, дипломын платформ, дизайны туршилтууд. Төсөл бүрийн цаадах зорилго, шийдэл, хөгжүүлэлттэй танилцаарай." />
    <section className="wrap work-index">
      <div className="filter-bar">
        <div role="group" aria-label="Төслийн ангилал">{filters.map(item => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}{item === 'Бүгд' && <sup>08</sup>}</button>)}</div>
        <span role="status" className="mono">{String(visible.length).padStart(2, '0')} ТӨСӨЛ</span>
      </div>
      <div className="work-list" key={filter}>{visible.map((project, i) => project.tier === 'concept' ? <ConceptCard key={project.id} project={project} /> : <FeatureProject key={project.id} project={project} index={i} />)}</div>
    </section><Cta /></>
}

const architecture = {
  citiled: {
    title: 'Нэг систем. Холбоотой давхаргууд.',
    nodes: [['01', 'Олон хэлний интерфэйс', 'MN / EN / 中文'], ['02', 'Бүтээгдэхүүний каталог', 'Ангилал · Үзүүлэлт'], ['03', 'Дэлгэрэнгүй хуудас', 'Зураг · Тайлбар'], ['04', 'Контент шинэчлэлт', 'Дотоод удирдлагатай'], ['05', 'Production', 'Cloudflare дээр байршуулсан']],
    bottom: ['КАТАЛОГ → БҮТЭЭГДЭХҮҮН → ХОЛБОО БАРИХ', 'КОНТЕНТ ШИНЭЧЛЭЛТ → НИЙТИЙН ХУУДАС'],
  },
  'gaming-course': {
    title: 'Хичээлээс тоглоом руу.',
    nodes: [['01', 'Learning UI', 'Next.js · Monaco · Canvas'], ['02', 'API / Services', 'Course · Lesson · Task'], ['03', 'Prisma ORM', 'Progress · Submission'], ['04', 'PostgreSQL', 'Users · Courses · XP'], ['05', 'Vercel', 'Production hosting']],
    bottom: ['ADMIN → КУРС / ХИЧЭЭЛ / ДААЛГАВАР', 'ДААЛГАВАР → XP → LIVE LEADERBOARD'],
  },
}
function Architecture({ project }: { project: Project }) {
  // Only the two production projects carry a system diagram; concepts have no backend
  // to draw. Returning null keeps `/work/<concept>` from crashing on a missing spec.
  const spec = architecture[project.id as keyof typeof architecture]
  if (!spec) return null
  return <section className={'architecture ' + (project.id === 'gaming-course' ? 'architecture-gaming' : '')} id="architecture">
    <div className="architecture-heading"><Label>СИСТЕМИЙН АРХИТЕКТУР</Label><h2>{spec.title}</h2></div>
    <div className="architecture-flow">{spec.nodes.map(([n, title, sub]) => <div key={n} className="architecture-node"><span className="node-index">{n}</span><h3>{title}</h3><p>{sub}</p></div>)}</div>
    <div className="architecture-bottom">{spec.bottom.map(line => <span key={line}>{line}</span>)}</div>
  </section>
}

/** Sticky screenshot holds while the numbered steps scroll past it. */
function StickyScene({ project }: { project: Project }) {
  return <section className="wrap sticky-scene" aria-label={project.name + ' төслийн гол хэсгүүд'}>
    <div className="sticky-visual"><ProjectVisual project={project} src={project.detail} /></div>
    <div className="sticky-steps">{project.scenes.map(scene => <Reveal className="sticky-step" key={scene.key}>
      <span className="mono">{scene.key}</span><h3>{scene.title}</h3><p>{scene.text}</p>
    </Reveal>)}</div>
  </section>
}

const sections = [['overview', '01 — Тойм'], ['approach', '02 — Дизайн'], ['development', '03 — Хөгжүүлэлт'], ['result', '04 — Үр дүн']]
function CaseStudy({ project }: { project: Project }) {
  const { projects } = useProjects()
  const progressRef = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState('overview')
  const coverRef = useParallax(20)
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const height = document.documentElement.scrollHeight - innerHeight
      if (progressRef.current) progressRef.current.style.transform = 'scaleX(' + (height > 0 ? Math.min(1, scrollY / height) : 0) + ')'
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update(); window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll)
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setCurrent(entry.target.id)
    }, { rootMargin: '-20% 0px -70% 0px' })
    for (const [id] of sections) { const el = document.getElementById(id); if (el) observer.observe(el) }
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); observer.disconnect() }
  }, [project.id])
  const next = projects[(projects.indexOf(project) + 1) % projects.length]
  const isMajor = project.tier === 'major'
  // Flagship concepts carry the same case-study depth as production work, but must never
  // be presented as production: the status pill and label stay on `isMajor`.
  const isDeep = project.tier !== 'concept'
  const nameLines = project.name.split(' ')
  return <article className={'case-study case-' + project.accent}>
    <div className="reading-progress" ref={progressRef} aria-hidden="true" />
    <header className="case-header wrap">
      <div className="case-topline"><Link href="/work" className="back-link">← Бүх ажлууд</Link><span className="mono">CASE STUDY / {project.number}</span></div>
      <span className={'status-pill ' + (isMajor ? 'is-live' : 'is-concept')}>{isMajor && <i />}{project.category}</span>
      <h1><Lines lines={nameLines} /></h1>
      <p className="case-headline">{project.headline}</p>
      <dl className="case-meta">
        <div><dt>Үүрэг</dt><dd>{project.role}</dd></div>
        <div><dt>Технологи</dt><dd>{project.tech.slice(0, 3).join(' / ')}</dd></div>
        <div><dt>Он</dt><dd>{project.year}</dd></div>
        <div><dt>Төлөв</dt><dd>{project.status}</dd></div>
      </dl>
      {project.href && <div className="case-live">
        <a className="live-link" href={project.href} target="_blank" rel="noopener noreferrer" aria-label={project.name + ' live site үзэх — шинэ цонхонд нээгдэнэ'}>Live Site<Arrow /></a>
        <span className="mono case-live-host">{project.liveLabel}</span>
      </div>}
    </header>

    <div className="wrap case-cover"><div ref={coverRef}><ProjectVisual project={project} priority /></div></div>

    {project.tier === 'concept' && <section className={'wrap project-mood mood-' + project.accent} aria-label="Дизайны дүрслэл">{project.id === 'coffee-shop' ? <><img src="/demos/morrow/images/cafe.jpg" alt="Morrow concept сайтын кофе шопын дулаан интерьер" width="1200" height="800" loading="lazy" /><div><Label>VISUAL DIRECTION</Label><h2>Өдөр тутмын<br /><em>жижиг завсарлага.</em></h2><p>Дулаан өнгө. Байгалийн гэрэл. Кофены мэдрэмж.</p></div></> : project.id === 'lune-beauty' ? <><img src="/demos/lune/images/hair.jpg" alt="LUNE concept сайтын үс арчилгааны дүрслэл" width="800" height="1000" loading="lazy" /><div><Label>VISUAL DIRECTION</Label><h2>Зөөлөн өнгө.<br /><em>Тайван хэмнэл.</em></h2></div><img src="/demos/lune/images/studio.jpg" alt="LUNE concept сайтын студийн орчин" width="1000" height="800" loading="lazy" /></> : <><div><Label>VISUAL DIRECTION</Label><h2>Орон зай.<br />Хэлбэр.<br /><em>Бүтэц.</em></h2></div><img src="/demos/nomad/images/architecture.jpg" alt="NOMAD concept сайтын архитектурын дүрслэл" width="1200" height="800" loading="lazy" /></>}</section>}

    <div className="wrap case-body">
      <aside className="case-sidebar"><Label>ТӨСЛИЙН ТУХАЙ</Label>
        <nav aria-label="Кейс судалгааны хэсгүүд">{sections.map(([id, label]) => <a key={id} href={'#' + id} className={current === id ? 'is-current' : ''} aria-current={current === id ? 'true' : undefined}>{label}</a>)}</nav>
        {project.href && <a className="text-link" href={project.href} target="_blank" rel="noopener noreferrer" aria-label={project.name + ' live site үзэх — шинэ цонхонд нээгдэнэ'}>Live Site<Arrow /></a>}
      </aside>
      <div className="case-content">
        <Reveal className="case-section"><section id="overview"><Label number="01">ТОЙМ</Label><h2>{project.headline}</h2><p className="lead">{project.overview}</p>
          <div className="problem-solution"><div><h3>Зорилго</h3><p>{project.problem}</p></div><div><h3>Шийдэл</h3><p>{project.solution}</p></div></div>
        </section></Reveal>
        <Reveal className="case-section"><section id="approach"><Label number="02">ДИЗАЙНЫ ШИЙДЭЛ</Label>
          <h2>{project.id === 'citiled' ? 'Бүтээгдэхүүний мэдээллийг цэгцлэх.'
            : project.id === 'gaming-course' ? 'Хичээл, код, тоглоомыг нэг дэлгэцэд.'
              : project.id === 'axion-x1' ? '3D загварыг scroll-оор задлах.'
                : project.id === 'khure-residence' ? 'Архитектурын мэдээллийг дарааллаар үзүүлэх.'
                  : project.id === 'coffee-shop' ? 'Кофе шопын орчныг зураг, өнгөөр.'
                    : project.id === 'lune-beauty' ? 'Үйлчилгээ, орчныг нэг өнгө аясаар.'
                      : 'Төслийн зургуудыг голд нь.'}</h2>
          <p>{project.design}</p>
          {project.tier === 'concept' && <div className={'design-palette palette-' + project.accent} aria-label="Төслийн өнгөний чиглэл"><span>01 / ҮНДСЭН</span><span>02 / ДЭВСГЭР</span><span>03 / АКЦЕНТ</span></div>}
        </section></Reveal>
      </div>
    </div>

    {isDeep && project.scenes.length > 0 && <StickyScene project={project} />}
    {isMajor && <div className="wrap"><Architecture project={project} /></div>}

    <section className="wrap responsive-showcase">
      {project.detail && <Reveal className="screenshot-detail" clip><div className="screenshot-label"><Label>DESKTOP / БОДИТ ДЭЛГЭЦ</Label><span>1440 PX</span></div><img src={project.detail} alt={project.name + ' төслийн компьютер дээрх дэлгэцийн зураг'} width="1440" height="1000" loading="lazy" decoding="async" /></Reveal>}
      {project.mobile && <Reveal className="mobile-detail"><div className="phone-frame"><img src={project.mobile} alt={project.name + ' төслийн гар утасны харагдац'} width="390" height="844" loading="lazy" decoding="async" /></div><p className="mono">MOBILE / 390 PX</p></Reveal>}
    </section>

    <div className="wrap case-body case-second">
      <div className="case-sidebar"><Label>DESIGN MEETS CODE</Label><span className="large-brace" aria-hidden="true" /></div>
      <div className="case-content">
        <Reveal className="case-section"><section id="development"><Label number="03">ХӨГЖҮҮЛЭЛТ</Label><h2>Харагдах байдлын цаана.</h2><p>{project.development}</p>
          <div className="stack-tags">{project.tech.map(item => <span key={item}>{item}</span>)}</div>
          <div className="feature-list">{project.features.map((feature, i) => <div key={feature.title}><span className="mono">0{i + 1}</span><div><h3>{feature.title}</h3><p>{feature.text}</p></div></div>)}</div>
        </section></Reveal>
        <Reveal className="challenge"><Label>СОРИЛТ → ШИЙДЭЛ</Label><h3>{project.challenge}</h3><p>{project.resolution}</p></Reveal>
        <Reveal className="case-section"><section id="result"><Label number="04">ҮР ДҮН</Label><h2>{project.id === 'citiled' ? 'Нийтэд ажиллаж буй гурван хэлний систем.'
          : project.id === 'gaming-course' ? 'Дипломын ажлаас нээлттэй платформ.'
            : project.id === 'axion-x1' ? '3D бүтээгдэхүүний танилцуулгын туршилт.'
              : project.id === 'khure-residence' ? 'Орон сууцны төслийг нэг урсгалд.'
                : project.id === 'coffee-shop' ? 'Меню, орчин, байршил нэг хуудсанд.'
                  : project.id === 'lune-beauty' ? 'Үйлчилгээ, галерей, цаг захиалга нэг дор.'
                    : 'Төсөл, үйлчилгээ, үнийн санал нэг бүтэцтэй.'}</h2><p className="lead">{project.result}</p></section></Reveal>
      </div>
    </div>

    <section className="next-project wrap"><Label>ДАРААГИЙН ТӨСӨЛ / {next.number}</Label><Link href={'/work/' + next.id} data-cursor="Үзэх"><span>{next.name}</span><Arrow /></Link><p>{next.category}</p></section>
  </article>
}

function Services() {
  return <><PageIntro index="02" label="SERVICES" lines={['Юу хийж', 'өгөх вэ.']} description="Нэг хуудасны танилцуулгаас өгөгдөл, админтай систем хүртэл хөгжүүлнэ. Хэрэгтэй ажлын хүрээг эхлээд ярилцаж тогтооно." />
    <section className="wrap service-list" aria-label="Үйлчилгээнүүд">{services.map((service, i) => <Reveal className="service-row" key={service.title}><span className="service-number">0{i + 1}</span><div><h2>{service.title}</h2><p>{service.subtitle}</p></div><div><p>{service.text}</p><ul>{service.items.map(item => <li key={item}>{item}</li>)}</ul></div><Link href="/contact" aria-label={service.title + ' төслийн талаар ярилцах'}><Arrow /></Link></Reveal>)}
    <p className="pricing-note"><span>ТӨСӨВ / ХҮРЭЭ</span>Үнэ төслийн цар хүрээнээс хамаарна. Хэрэгтэй боломж, агуулга, хугацаагаа ярилцаад тодорхой санал гаргана.</p></section>
    <section className="wrap section-space process-section"><div><Label>ХАМТРАН АЖИЛЛАХ ЯВЦ</Label><h2>Алхам бүр<br /><em>ойлгомжтой.</em></h2></div><div className="process-list">{process.map((step, i) => <details key={step.title} open={i === 0}><summary><span>0{i + 1}</span><h3>{step.title}</h3><span className="plus">+</span></summary><p>{step.text}</p></details>)}</div></section><Cta /></>
}

function About() {
  const { projects } = useProjects()
  const major = projects.filter(p => p.tier === 'major')
  return <><PageIntro index="03" label="ABOUT / БАТБАЯСГАЛАН" lines={['Дизайн хийж,', 'кодыг нь бичдэг.']} description="Сайн байна уу, би Батбаясгалан. Улаанбаатарт ажилладаг бие даасан web developer. Энд хийсэн ажлууд, ашигласан шийдэл, ажиллах арга барилаа танилцуулдаг." />
    <section className="wrap about-profile">
      <Reveal className="identity-panel">
        <span className="identity-grid" aria-hidden="true" />
        <div className="identity-top"><span className="mono">B-T-B-N WEB</span><span className="availability"><i />Нээлттэй</span></div>
        <div className="identity-monogram"><Mark className="identity-mark" title="B-T-B-N Web" /><span className="identity-wordmark" aria-hidden="true">B-T-B-N <b>Web</b></span></div>
        <div className="identity-foot">
          <div><h2>Батбаясгалан</h2><p>Web Developer · Full-stack</p></div>
          <dl className="identity-meta">
            <div><dt>Байршил</dt><dd>Улаанбаатар, МН</dd></div>
            <div><dt>Ажиллах хэлбэр</dt><dd>Бие даасан / Remote</dd></div>
          </dl>
        </div>
      </Reveal>
      <Reveal className="about-story">
        <Label>МИНИЙ ХАНДЛАГА</Label>
        <h2>Эхлээд бүтэц.<br /><em>Дараа нь дизайн, код.</em></h2>
        <p className="about-lede">Frontend интерфэйсээс өгөгдөл, админтай full-stack систем хүртэл хөгжүүлдэг. Төлөвлөлтөөс production-д гаргах хүртэлх ажлыг өөрөө хариуцна.</p>
        <dl className="about-points">
          <div><dt>Эхлээд хийх зүйлээ тогтооно</dt><dd>Хэрэглэгч юу хийхийг тодорхойлсны дараа хуудасны бүтэц, дизайн, кодоо шийднэ.</dd></div>
          <div><dt>Бүх дэлгэцэд</dt><dd>Утас, таблет, компьютер дээр адилхан ойлгомжтой ажиллана.</dd></div>
          <div><dt>Цааш хөгжүүлэхэд хялбар</dt><dd>Засах, өргөтгөхөд ойлгомжтой байхаар кодыг цэгцтэй бичнэ.</dd></div>
        </dl>
        <p className="about-proof">Доорх хоёр төсөл нийтэд нээлттэй ажиллаж байна — ажлыг маань шууд үзэж болно.</p>
        <DirectContact /></Reveal>
    </section>
    <section className="wrap proof-section" aria-label="Нийтлэгдсэн ажлууд">
      <Label>БОДИТ АЖЛУУД</Label>
      <div className="proof-grid">{major.map(project => <Reveal className="proof-item" key={project.id}>
        <div className="proof-head"><span className="status-pill is-live"><i />{project.status}</span><span className="mono">{project.year}</span></div>
        <h3>{project.name}</h3>
        <p>{project.headline}</p>
        <div className="proof-links">
          <Link href={'/work/' + project.id} className="case-link">Кейс судалгаа<Arrow /></Link>
          <a className="live-link" href={project.href} target="_blank" rel="noopener noreferrer" aria-label={project.name + ' live site үзэх — шинэ цонхонд нээгдэнэ'}>Live Site<Arrow /></a>
        </div>
      </Reveal>)}</div>
    </section>
    <section className="wrap section-space tech-section"><div><Label>АШИГЛАДАГ ТЕХНОЛОГИ</Label><h2>Ажилд тохирох<br /><em>хэрэгсэл.</em></h2><p className="tech-note">Технологи бол зорилго биш, хэрэгсэл. Төслийн хэмжээ, хугацаа, цаашид арчлах боломжид тохируулж сонгоно.</p></div><div>{stack.map(group => <div className="stack-row" key={group.label}><h3>{group.label}</h3><div>{group.items.map(item => <span key={item}>{item}</span>)}</div></div>)}<p className="ai-note">AI хэрэгслийг давтагдах ажил, шалгалт, код цэгцлэхэд ашигладаг. Шийдэл, архитектур, эцсийн кодоо өөрөө хариуцна.</p></div></section>
    <section className="wrap values-section"><Label>АЖЛЫН ЗАРЧИМ</Label><div>{[['01', 'Ойлгомжтой байх', 'Агуулга, дизайн, код — аль нь ч шаардлагагүй төвөгтэй байх ёсгүй.'], ['02', 'Бодитоор ажиллах', 'Сайхан зураг хангалтгүй. Холбоос, маягт, өгөгдөл, жижиг дэлгэцийн хэрэглээ бүр чухал.'], ['03', 'Хамт шийдэх', 'Явцыг нээлттэй харуулж, санал хүсэлтийг ажилд тухай бүр тусгана.']].map(([n, title, text]) => <Reveal key={n}><span className="mono">{n}</span><h3>{title}</h3><p>{text}</p></Reveal>)}</div></section><Cta /></>
}

function Contact() {
  return <><PageIntro index="04" label="LET’S TALK" lines={['Төслөө', 'ярилцъя.']} description="Бүгд тодорхой болсон байх шаардлагагүй. Юу хийхийг хүсэж байгаагаа бичихэд хангалттай." />
    <section className="wrap contact-layout"><div className="contact-aside"><span className="availability"><i />Шинэ төсөлд нээлттэй</span><h2>Товч мэдээллээс<br />эхэлж болно.</h2><p>Landing page, бизнесийн сайт эсвэл өгөгдөлтэй систем хэрэгтэй бол зорилго, хүрээг нь хамт тодорхойлно.</p><DirectContact /><div className="contact-signature"><span className="signature">Б.</span><div>Батбаясгалан<p>Web Developer / Ulaanbaatar</p></div></div><p className="contact-note">Маягтаар илгээсэн мэдээлэл шууд и-мэйлээр ирнэ. Сошиал сувгаар бичсэн ч болно.</p></div><ContactForm /></section>
  </>
}

function Pages() {
  const { path } = useRoute()
  const { projects, loading } = useProjects()
  const project = projects.find(item => path === '/work/' + item.id)
  const title = project ? project.name : path === '/' ? 'Вэб хөгжүүлэгч Батбаясгалан' : navigation.find(item => item.href === path)?.label || 'Хуудас олдсонгүй'
  const initial = useRef(true)
  useEffect(() => {
    document.title = title + ' — B-T-B-N Web'
    const description = project?.description || 'Батбаясгалан — landing page, бизнесийн вэбсайт, full-stack систем хөгжүүлдэг бие даасан web developer. Сонгосон ажлууд болон кейс судалгаа.'
    document.querySelector('meta[name="description"]')?.setAttribute('content', description)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', document.title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description)
    if (!initial.current) document.getElementById('main')?.focus({ preventScroll: true })
    initial.current = false
  }, [path, title, project])
  let content
  if (path === '/admin' || path.startsWith('/admin/')) return <AdminApp />
  if (path === '/') content = <Home />
  else if (path === '/work') content = <Work />
  else if (project) content = <CaseStudy project={project} />
  else if (path === '/services') content = <Services />
  else if (path === '/about') content = <About />
  else if (path === '/contact') content = <Contact />
  else if (loading && path.startsWith('/work/')) content = <section className="wrap not-found" aria-busy="true"><Label>АЧААЛЖ БАЙНА</Label><h1>Түр хүлээнэ үү.</h1></section>
  else content = <section className="wrap not-found"><Label>404 / PAGE NOT FOUND</Label><h1>Энэ хуудас<br /><em>олдсонгүй.</em></h1><Button href="/work">Ажлууд руу очих</Button></section>
  return <><a href="#main" className="skip-link">Үндсэн агуулга руу очих</a><Navbar key={path} /><main id="main" tabIndex={-1}><div className="route-page" key={path}>{content}</div></main><Footer /><Cursor /></>
}
/**
 * Loads projects from the D1-backed API, falling back to the bundled snapshot so the
 * site still renders if the API is unreachable. Published rows only — the API filters
 * unpublished projects out server-side.
 */
function ProjectsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ projects: Project[]; loading: boolean; error: string | null }>(
    { projects: fallbackProjects, loading: true, error: null })
  useEffect(() => {
    let active = true
    fetchProjects()
      .then(projects => { if (active) setState({ projects, loading: false, error: null }) })
      .catch(() => { if (active) setState({ projects: fallbackProjects, loading: false, error: 'offline' }) })
    return () => { active = false }
  }, [])
  return <ProjectsContext.Provider value={state}>{children}</ProjectsContext.Provider>
}
export default function App() { return <Router><ProjectsProvider><Pages /></ProjectsProvider></Router> }
