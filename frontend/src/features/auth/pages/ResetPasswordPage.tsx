import { type FormEvent, useMemo, useState } from 'react'
import { FormField } from '../../../shared/components/FormField/FormField'
import type { FieldErrors, Language } from '../../../shared/types'
import { AuthLayout } from '../components/AuthLayout'
import { AuthSwitch } from '../components/AuthSwitch'
import { validateResetPasswordForm } from '../model/authValidation'
import { setNewPassword } from '../services/authService'
import type { AuthToastHandler, AuthTranslation } from '../types'

export function ResetPasswordPage({
  t,
  language,
  search,
  onBackLogin,
  onToast,
}: {
  t: AuthTranslation
  language: Language
  search: string
  onBackLogin: () => void
  onToast: AuthToastHandler
}) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const params = useMemo(() => new URLSearchParams(search), [search])
  const userId = params.get('userId')
  const token = params.get('token')
  const isLinkValid = Boolean(userId && token)

  const validate = () => {
    const nextErrors = validateResetPasswordForm(password, confirmPassword, t)
    setErrors(nextErrors)

    const isValid = Object.keys(nextErrors).length === 0
    if (!isValid) {
      onToast(t.validationFailed, 'error')
    }

    return isValid
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isLinkValid || !userId || !token) {
      onToast(t.resetPasswordInvalidLink, 'error')
      return
    }

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await setNewPassword(userId, token, password, language)

      if (!result.success) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onToast(result.message || t.passwordResetSuccess, 'success')
      onBackLogin()
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout isProcessing={isSubmitting} loadingLabel={t.loading}>
      <div className="auth-card">
        <p className="eyebrow">{t.resetPasswordEyebrow}</p>
        <h1>{t.resetPasswordTitle}</h1>
        <p className="auth-copy">{isLinkValid ? t.resetPasswordCopy : t.resetPasswordInvalidLink}</p>
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <FormField
            error={errors.password}
            label={t.newPassword}
            type="password"
            value={password}
            onChange={setPassword}
          />
          <FormField
            error={errors.confirmPassword}
            label={t.confirmNewPassword}
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
          />
          <button className="form-submit" type="submit" disabled={isSubmitting || !isLinkValid}>
            {t.setNewPassword}
          </button>
        </form>
        <AuthSwitch actionLabel={t.backToLogin} onClick={onBackLogin} />
      </div>
    </AuthLayout>
  )
}
