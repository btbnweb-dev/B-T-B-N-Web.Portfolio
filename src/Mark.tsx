/**
 * B-T-B-N Web brand mark, redrawn as vector from the supplied logo.
 *
 * Geometry: a `< >` code bracket with a centre dot, followed by two forward
 * slashes. Strokes inherit `currentColor` so the mark can sit on any surface;
 * the centre dot and the trailing slash carry the lime accent.
 */
export function Mark({ className = '', title }: { className?: string; title?: string }) {
  return <svg className={'brand-mark ' + className} viewBox="0 0 186 74" fill="none"
    role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
    {title && <title>{title}</title>}
    <g stroke="currentColor" strokeWidth="10" strokeLinecap="square" strokeLinejoin="miter">
      {/* left bracket  <  */}
      <path d="M42 9 11 37l31 28" />
      {/* right bracket  >  */}
      <path d="M69 9l31 28-31 28" />
      {/* two slashes  //  */}
      <path d="M138 9 115 65" />
      <path className="mark-accent" d="M175 9l-23 56" />
    </g>
    {/* centre dot */}
    <circle className="mark-dot" cx="55.5" cy="37" r="8" fill="currentColor" />
  </svg>
}
