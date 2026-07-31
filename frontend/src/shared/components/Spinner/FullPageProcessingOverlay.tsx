import { createPortal } from 'react-dom'
import { LoadingSpinner } from './LoadingSpinner'

export function FullPageProcessingOverlay({ label }: { label: string }) {
  return createPortal(
    <div className="processing-overlay page-processing-overlay" role="status" aria-live="polite">
      <div>
        <LoadingSpinner />
        <strong>{label}</strong>
      </div>
    </div>,
    document.body,
  )
}
