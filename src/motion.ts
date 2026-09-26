import { useEffect, useRef } from 'react'

export const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Very light translate tied to scroll position. Transform-only, rAF-throttled and
 * limited to pointer-capable large screens; disabled entirely under reduced motion.
 */
export function useParallax(strength = 26) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || strength === 0 || reduced() || !matchMedia('(min-width: 900px)').matches) return
    let frame = 0
    const update = () => {
      frame = 0
      const box = el.getBoundingClientRect()
      if (box.bottom < 0 || box.top > innerHeight) return
      const progress = (box.top + box.height / 2 - innerHeight / 2) / innerHeight
      el.style.transform = 'translate3d(0,' + (progress * -strength).toFixed(2) + 'px,0)'
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    addEventListener('scroll', onScroll, { passive: true })
    addEventListener('resize', onScroll)
    return () => { cancelAnimationFrame(frame); removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll) }
  }, [strength])
  return ref
}
