import type { Translation } from '../../i18n'

export function validateEmail(email: string, t: Translation): string | undefined {
  if (!email.trim()) {
    return t.required
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? undefined : t.emailInvalid
}

export function validatePassword(password: string, t: Translation): string | undefined {
  if (!password) {
    return t.required
  }

  return password.length >= 6 ? undefined : t.passwordShort
}

