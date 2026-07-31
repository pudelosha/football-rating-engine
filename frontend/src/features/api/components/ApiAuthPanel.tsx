import { MenuIcon } from '../../../shared/components/Icons'
import { ApiJsonBlock } from './ApiJsonBlock'
import type { ApiTranslation } from '../types'

export function ApiAuthPanel({
  t,
  authTokenSample,
  apiKeyValue,
  hasApiKey,
  isApiKeyVisible,
  isGeneratingApiKey,
  onRevealToggle,
  onGenerateApiKey,
}: {
  t: ApiTranslation
  authTokenSample: unknown
  apiKeyValue: string
  hasApiKey: boolean
  isApiKeyVisible: boolean
  isGeneratingApiKey: boolean
  onRevealToggle: () => void
  onGenerateApiKey: () => void
}) {
  return (
    <section className="details-panel api-doc-card">
      <div className="details-panel-heading">
        <MenuIcon name="api" />
        <h2>{t.apiHeaderTitle}</h2>
      </div>
      <p>{t.apiHeaderCopy}</p>
      <div className="api-key-example">
        <span>{t.apiKeyHeader}</span>
        <code>X-Api-Key: &lt;your-api-key&gt;</code>
      </div>
      <div className="api-auth-grid">
        <ApiJsonBlock title={t.apiAuthTokenTitle} value={authTokenSample} />
        <ApiJsonBlock
          title={t.apiUserApiKeyTitle}
          value={apiKeyValue}
          action={(
            <button
              type="button"
              disabled={isGeneratingApiKey}
              onClick={hasApiKey ? onRevealToggle : onGenerateApiKey}
            >
              {hasApiKey ? (isApiKeyVisible ? t.apiHide : t.apiReveal) : (isGeneratingApiKey ? '...' : t.rotateApiKey)}
            </button>
          )}
        />
      </div>
    </section>
  )
}
