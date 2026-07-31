import { MenuIcon } from '../../../shared/components/Icons'
import { ApiEndpointTile } from './ApiEndpointTile'
import type { ApiEndpointExample, ApiTranslation } from '../types'

export function ApiEndpointsPanel({
  t,
  endpoints,
}: {
  t: ApiTranslation
  endpoints: ApiEndpointExample[]
}) {
  return (
    <section className="details-panel api-doc-card">
      <div className="details-panel-heading">
        <MenuIcon name="matches" />
        <h2>{t.apiEndpointsTitle}</h2>
      </div>
      <div className="api-endpoint-list">
        {endpoints.map((endpoint) => (
          <ApiEndpointTile endpoint={endpoint} key={endpoint.key} t={t} />
        ))}
      </div>
    </section>
  )
}
