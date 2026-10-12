import type { CSSProperties } from 'react'

/**
 * Realistische Schallplatte: feine Rillen, Liedpausen-Ringe, Glanz, der stehen bleibt,
 * Cover als Label in der Mitte mit Mittelloch. Dreht sich ruhig (eine Umdrehung in ~4,5 s).
 */
export function Vinyl({ cover, spinning = true, size, className, style, color }: { cover?: string; spinning?: boolean; size?: number | string; className?: string; style?: CSSProperties; color?: string }) {
  return (
    <div
      className={'vinyl' + (spinning ? ' spin' : '') + (className ? ' ' + className : '')}
      style={{ width: size, height: size, ['--vc' as string]: color || 'var(--primary)', ...style }}
      aria-hidden
    >
      <div className="vinyl-disc">
        <div className="vinyl-grooves" />
        <div className="vinyl-tracks" />
        <div className="vinyl-label" style={cover ? { backgroundImage: `url(${cover})` } : undefined}>
          {!cover ? <span className="vinyl-label-blank" /> : null}
          <span className="vinyl-label-ring" />
        </div>
        <span className="vinyl-hole" />
      </div>
      <div className="vinyl-sheen" />
      <div className="vinyl-rim" />
    </div>
  )
}
