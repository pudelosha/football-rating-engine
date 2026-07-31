import { confirmEmail, postAuth, resetPassword } from '../../../shared/api/authApi'
import type { Language } from '../../../shared/types'

export function login(email: string, password: string, language: Language) {
  return postAuth('/api/auth/login', { email, password, language })
}

export function register(email: string, password: string, language: Language) {
  return postAuth('/api/auth/register', {
    email,
    password,
    displayName: null,
    language,
  })
}

export function requestPasswordReset(email: string, language: Language) {
  return postAuth('/api/auth/request-password-reset', { email, language })
}

export function resendConfirmationEmail(email: string, language: Language) {
  return postAuth('/api/auth/resend-confirmation-email', { email, language })
}

export function confirmEmailAddress(userId: string, token: string, language: Language) {
  return confirmEmail(userId, token, language)
}

export function setNewPassword(userId: string, token: string, password: string, language: Language) {
  return resetPassword(userId, token, password, language)
}
