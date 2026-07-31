import type { AuthResponse, Language } from '../types'
import { API_BASE_URL } from './apiConfig'

const confirmEmailRequests = new Map<string, Promise<AuthResponse>>()

export async function postAuth(path: string, body: object): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await response.json().catch(() => null)) as Partial<AuthResponse> | null

  if (!response.ok || !data?.success) {
    return {
      success: false,
      message: data?.message ?? response.statusText,
    }
  }

  return {
    success: true,
    message: data.message ?? '',
    token: data.token,
    apiKey: data.apiKey,
  }
}

export async function confirmEmail(userId: string, token: string, language: Language): Promise<AuthResponse> {
  const params = new URLSearchParams({ userId, token, language })
  const requestKey = params.toString()
  const existingRequest = confirmEmailRequests.get(requestKey)
  if (existingRequest) {
    return existingRequest
  }

  const request = fetch(`${API_BASE_URL}/api/auth/confirm-email?${requestKey}`)
    .then(async (response) => {
      const data = (await response.json().catch(() => null)) as Partial<AuthResponse> | null

      if (!response.ok || !data?.success) {
        return {
          success: false,
          message: data?.message ?? response.statusText,
        }
      }

      return {
        success: true,
        message: data.message ?? '',
      }
    })

  confirmEmailRequests.set(requestKey, request)
  return request
}

export async function resetPassword(userId: string, token: string, newPassword: string, language: Language): Promise<AuthResponse> {
  return postAuth('/api/auth/reset-password', {
    userId,
    token,
    newPassword,
    language,
  })
}

