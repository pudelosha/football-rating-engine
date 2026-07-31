import { useEffect } from 'react'
import { MenuIcon } from '../../../shared/components/Icons'
import { ModalShell } from '../../../shared/components/Modal/ModalShell'
import type { ProfileTranslation } from '../types'

export function ApiKeyRotationModal({
  t,
  isRotating,
  onCancel,
  onConfirm,
}: {
  t: ProfileTranslation
  isRotating: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isRotating) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isRotating, onCancel])

  return (
    <ModalShell isLocked={isRotating} onCancel={onCancel}>
      <div className="delete-modal-icon">
        <MenuIcon name="api" />
      </div>
      <div className="delete-modal-copy">
        <p className="eyebrow">{t.rotateApiKeyTitle}</p>
        <h2 id="rotate-api-key-title">{t.rotateApiKeyConfirmTitle}</h2>
        <p>{t.rotateApiKeyConfirmCopy}</p>
        <div className="delete-modal-target">
          <strong>{t.apiKeyPurposeTitle}</strong>
          <span>{t.apiKeyPurposeCopy}</span>
        </div>
      </div>
      <div className="delete-modal-actions">
        <button type="button" disabled={isRotating} onClick={onCancel}>
          {t.cancel}
        </button>
        <button className="danger" type="button" disabled={isRotating} onClick={onConfirm}>
          {isRotating ? '...' : t.rotateApiKeyConfirmAction}
        </button>
      </div>
    </ModalShell>
  )
}
