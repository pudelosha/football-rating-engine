import { authorizedRequest } from '../../../shared/api/httpClient'
import type { AuthActionResponse, Language, RotateApiKeyResponse, UserProfile } from '../../../shared/types'

export function fetchProfile(token: string) {
  return authorizedRequest<UserProfile>(token, '/api/users/me')
}

export function updateProfile(token: string, displayName: string, language: Language) {
  return authorizedRequest<AuthActionResponse>(token, '/api/users/me', {
    method: 'PUT',
    body: JSON.stringify({ displayName: displayName.trim() || null, language }),
  })
}

export function updateEmail(token: string, newEmail: string, password: string, language: Language) {
  return authorizedRequest<AuthActionResponse>(token, '/api/users/me/change-email', {
    method: 'POST',
    body: JSON.stringify({ newEmail, password, language }),
  })
}

export function updatePassword(token: string, currentPassword: string, newPassword: string, language: Language) {
  return authorizedRequest<AuthActionResponse>(token, '/api/users/me/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword, language }),
  })
}

export function rotateApiKey(token: string, language: Language) {
  const params = new URLSearchParams({ language })
  return authorizedRequest<RotateApiKeyResponse>(token, `/api/users/me/rotate-api-key?${params}`, {
    method: 'POST',
  })
}
