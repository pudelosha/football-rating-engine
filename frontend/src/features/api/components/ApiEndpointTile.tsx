import { ApiJsonBlock } from './ApiJsonBlock'
import type { ApiEndpointExample, ApiTranslation } from '../types'

export function ApiEndpointTile({
  t,
  endpoint,
}: {
  t: ApiTranslation
  endpoint: ApiEndpointExample
}) {
  return (
    <article className="api-endpoint-tile static">
      <div className="api-json-block api-endpoint-summary">
        <strong>{endpoint.label}</strong>
        <code>{endpoint.endpoint}</code>
      </div>
      <div className="api-endpoint-details">
        <ApiJsonBlock title={t.apiRequestSample} value={endpoint.request} />
        <ApiJsonBlock title={t.apiResponseSample} value={endpoint.response} />
      </div>
    </article>
  )
}
