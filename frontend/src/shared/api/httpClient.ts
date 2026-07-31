import { API_BASE_URL } from './apiConfig'

export async function authorizedRequest<T>(
  token: string,
  path: string,
  options: RequestInit = {},
): Promise<{ ok: boolean; status: number; data?: T; message?: string }> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })

  const hasBody = response.status !== 204
  const data = hasBody ? await response.json().catch(() => null) : null

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: typeof data?.message === 'string' ? data.message : response.statusText,
    }
  }

  return {
    ok: true,
    status: response.status,
    data: data as T,
  }
}

