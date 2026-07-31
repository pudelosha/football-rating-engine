import { authorizedRequest } from '../../../shared/api/httpClient'
import type { Language, RotateApiKeyResponse } from '../../../shared/types'

export function rotateApiKey(token: string, language: Language) {
  const params = new URLSearchParams({ language })
  return authorizedRequest<RotateApiKeyResponse>(token, `/api/users/me/rotate-api-key?${params}`, {
    method: 'POST',
  })
}
