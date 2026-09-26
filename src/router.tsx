import { useEffect, useState } from 'react'
import { RouterContext, useRoute } from './route-state'
import type { AnchorHTMLAttributes } from 'react'
export function Router({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState(() => location.pathname.replace(/\/$/, '') || '/')
  useEffect(() => {
    const pop = () => { setPath(location.pathname.replace(/\/$/, '') || '/'); window.scrollTo(0, 0) }
    window.addEventListener('popstate', pop)
    return () => window.removeEventListener('popstate', pop)
  }, [])
  const navigate = (next: string) => {
    if (next === path) { window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    history.pushState(null, '', next)
    setPath(next)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  return <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>
}
export function Link({ href = '/', onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { navigate } = useRoute()
  return <a {...props} href={href} onClick={event => {
    onClick?.(event)
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && !props.target && href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/demos/')) {
      event.preventDefault(); navigate(href)
    }
  }} />
}
