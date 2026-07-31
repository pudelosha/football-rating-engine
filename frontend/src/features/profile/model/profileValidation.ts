import type { FieldErrors } from '../../../shared/types'
import { validateEmail, validatePassword } from '../../../shared/utils/validation'
import type { ProfileTranslation } from '../types'

function compactFieldErrors(errors: FieldErrors) {
  const nextErrors = { ...errors }

  Object.keys(nextErrors).forEach((key) => {
    if (!nextErrors[key as keyof FieldErrors]) {
      delete nextErrors[key as keyof FieldErrors]
    }
  })

  return nextErrors
}

export function validateEmailChangeForm(newEmail: string, password: string, t: ProfileTranslation) {
  return compactFieldErrors({
    email: validateEmail(newEmail, t),
    password: password ? undefined : t.required,
  })
}

export function validatePasswordChangeForm({
  currentPassword,
  newPassword,
  confirmNewPassword,
  t,
}: {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
  t: ProfileTranslation
}) {
  const errors: FieldErrors = {
    currentPassword: currentPassword ? undefined : t.required,
    password: validatePassword(newPassword, t),
  }

  if (!confirmNewPassword) {
    errors.confirmPassword = t.required
  } else if (newPassword !== confirmNewPassword) {
    errors.confirmPassword = t.passwordMismatch
  }

  return compactFieldErrors(errors)
}
