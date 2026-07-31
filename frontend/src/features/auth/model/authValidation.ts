import type { FieldErrors } from '../../../shared/types'
import { validateEmail, validatePassword } from '../../../shared/utils/validation'
import type { AuthTranslation } from '../types'

export function compactFieldErrors(errors: FieldErrors) {
  const nextErrors = { ...errors }

  Object.keys(nextErrors).forEach((key) => {
    if (!nextErrors[key as keyof FieldErrors]) {
      delete nextErrors[key as keyof FieldErrors]
    }
  })

  return nextErrors
}

export function validateLoginForm(email: string, password: string, t: AuthTranslation) {
  return compactFieldErrors({
    email: validateEmail(email, t),
    password: validatePassword(password, t),
  })
}

export function validateRegisterForm({
  email,
  password,
  confirmPassword,
  termsAccepted,
  t,
}: {
  email: string
  password: string
  confirmPassword: string
  termsAccepted: boolean
  t: AuthTranslation
}) {
  const errors = validateLoginForm(email, password, t)

  if (!confirmPassword) {
    errors.confirmPassword = t.required
  } else if (password !== confirmPassword) {
    errors.confirmPassword = t.passwordMismatch
  }

  if (!termsAccepted) {
    errors.termsAccepted = t.termsRequired
  }

  return compactFieldErrors(errors)
}

export function validateEmailActionForm(email: string, t: AuthTranslation) {
  const emailError = validateEmail(email, t)
  return emailError ? { email: emailError } : {}
}

export function validateResetPasswordForm(password: string, confirmPassword: string, t: AuthTranslation) {
  const errors: FieldErrors = {
    password: validatePassword(password, t),
  }

  if (!confirmPassword) {
    errors.confirmPassword = t.required
  } else if (password !== confirmPassword) {
    errors.confirmPassword = t.passwordMismatch
  }

  return compactFieldErrors(errors)
}
