import { useMemo, useState } from 'react'
import { ApiAuthPanel } from '../components/ApiAuthPanel'
import { ApiEndpointsPanel } from '../components/ApiEndpointsPanel'
import { createAuthTokenSample, createMatchEndpointExamples } from '../model/apiExamples'
import { rotateApiKey } from '../services/apiService'
import type { ApiToastHandler, ApiTranslation, ApiUserSession } from '../types'
import type { Language } from '../../../shared/types'

export function ApiPage({
  t,
  user,
  language,
  onToast,
}: {
  t: ApiTranslation
  user: ApiUserSession
  language: Language
  onToast: ApiToastHandler
}) {
  const [apiKey, setApiKey] = useState(user.apiKey ?? '')
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false)
  const [isGeneratingApiKey, setIsGeneratingApiKey] = useState(false)
  const endpoints = useMemo(() => createMatchEndpointExamples(t), [t])
  const authTokenSample = useMemo(() => createAuthTokenSample(user), [user])
  const apiKeyValue = isApiKeyVisible
    ? apiKey || t.apiKeyUnavailable
    : '********************************'

  const generateApiKey = async () => {
    setIsGeneratingApiKey(true)
    try {
      const result = await rotateApiKey(user.token, language)

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setApiKey(result.data.apiKey)
      setIsApiKeyVisible(true)
      onToast(result.data.message || t.apiKeyRotated, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsGeneratingApiKey(false)
    }
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content api-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.apiPanelEyebrow}</p>
          <h1>{t.apiPanelTitle}</h1>
          <p>{t.apiPanelCopy}</p>
        </div>

        <ApiAuthPanel
          apiKeyValue={apiKeyValue}
          authTokenSample={authTokenSample}
          hasApiKey={Boolean(apiKey)}
          isApiKeyVisible={isApiKeyVisible}
          isGeneratingApiKey={isGeneratingApiKey}
          t={t}
          onGenerateApiKey={generateApiKey}
          onRevealToggle={() => setIsApiKeyVisible((current) => !current)}
        />

        <ApiEndpointsPanel endpoints={endpoints} t={t} />
      </div>
    </section>
  )
}
