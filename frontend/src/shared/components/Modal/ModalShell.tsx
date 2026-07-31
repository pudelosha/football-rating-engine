import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ModalShellProps = {
  children: ReactNode
  className?: string
  isLocked?: boolean
  onCancel: () => void
}

export function ModalShell({ children, className = 'delete-modal', isLocked = false, onCancel }: ModalShellProps) {
  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isLocked && onCancel()}>
      <section
        className={className}
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {children}
      </section>
    </div>,
    document.body,
  )
}
