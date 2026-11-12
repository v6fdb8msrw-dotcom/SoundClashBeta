import type { CSSProperties } from 'react'

/**
 * Realistische Schallplatte: feine Rillen, Liedpausen-Ringe, Glanz, der stehen bleibt, Mittelloch.
 * Mit Cover wird sie zur Picture-Disc: das Cover liegt über der ganzen Platte, Rillen und Glanz
 * darüber (Tims Wunsch). Ohne Cover: schwarze Platte mit farbigem Label. Dreht sich ruhig.
 */
export function Vinyl({ cover, spinning = true, size, className, style, color }: { cover?: string; spinning?: boolean; size?: number | string; className?: string; style?: CSSProperties; color?: string }) {
  return (
    <div
      className={'vinyl' + (cover ? ' pic' : '') + (spinning ? ' spin' : '') + (className ? ' ' + className : '')}
      style={{ width: size, height: size, ['--vc' as string]: color || 'var(--primary)', ...style }}
      aria-hidden
    >
      <div className="vinyl-disc">
        {cover ? <div className="vinyl-art" style={{ backgroundImage: `url(${cover})` }} /> : null}
        <div className="vinyl-grooves" />
        <div className="vinyl-tracks" />
        <div className="vinyl-label">
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
