import type { ReactNode } from 'react'

export function RatingValue({
  value,
  children,
}: {
  value: ReactNode
  children: ReactNode
}) {
  return (
    <span className="rating-value-tooltip" tabIndex={0}>
      <span className="rating-value-display">{value}</span>
      <span className="rating-tooltip-panel" role="tooltip">
        {children}
      </span>
    </span>
  )
}
