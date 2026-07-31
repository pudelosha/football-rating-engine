import { MenuIcon } from '../../../shared/components/Icons'
import type { ProfileSubmitTarget, ProfileTranslation } from '../types'

export function ApiKeyPanel({
  isApiKeyVisible,
  isSubmitting,
  newApiKey,
  t,
  onRevealToggle,
  onRotateClick,
}: {
  isApiKeyVisible: boolean
  isSubmitting: ProfileSubmitTarget | null
  newApiKey: string
  t: ProfileTranslation
  onRevealToggle: () => void
  onRotateClick: () => void
}) {
  return (
    <section className="details-panel profile-form-panel api-key-panel">
      <div className="details-panel-heading">
        <MenuIcon name="api" />
        <h2>{t.rotateApiKeyTitle}</h2>
      </div>
      <div className="api-key-purpose">
        <strong>{t.apiKeyPurposeTitle}</strong>
        <p>{t.apiKeyPurposeCopy}</p>
      </div>
      <div className="api-key-current">
        <span>{t.currentApiKey}</span>
        <code>{newApiKey && isApiKeyVisible ? newApiKey : '********************************'}</code>
        <small>{newApiKey ? t.newApiKey : t.apiKeyHidden}</small>
      </div>
      <div className="profile-api-actions">
        <button className="form-submit secondary" type="button" disabled={!newApiKey} onClick={onRevealToggle}>
          {isApiKeyVisible ? t.hideApiKey : t.revealApiKey}
        </button>
        <button className="form-submit" type="button" disabled={isSubmitting === 'apiKey'} onClick={onRotateClick}>
          {t.rotateApiKey}
        </button>
      </div>
    </section>
  )
}
