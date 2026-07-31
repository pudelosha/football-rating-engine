import { type FormEvent, useState } from 'react'
import { FormField } from '../../../shared/components/FormField/FormField'
import type { FieldErrors, Language } from '../../../shared/types'
import { AuthLayout } from '../components/AuthLayout'
import { AuthSwitch } from '../components/AuthSwitch'
import { validateEmailActionForm } from '../model/authValidation'
import { requestPasswordReset, resendConfirmationEmail } from '../services/authService'
import type { AuthToastHandler, AuthTranslation, EmailActionMode } from '../types'

export function EmailActionPage({
  mode,
  language,
  t,
  onBackLogin,
  onToast,
}: {
  mode: EmailActionMode
  language: Language
  t: AuthTranslation
  onBackLogin: () => void
  onToast: AuthToastHandler
}) {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isForgotPassword = mode === 'forgot-password'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors = validateEmailActionForm(email, t)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const result = isForgotPassword
        ? await requestPasswordReset(email, language)
        : await resendConfirmationEmail(email, language)

      if (!result.success) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onToast(
        result.message || (isForgotPassword ? t.resetRequested : t.activationRequested),
        'success',
      )
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
        <p className="eyebrow">{isForgotPassword ? t.forgotPasswordEyebrow : t.resendActivationEyebrow}</p>
        <h1>{isForgotPassword ? t.forgotPasswordTitle : t.resendActivationTitle}</h1>
        <p className="auth-copy">{isForgotPassword ? t.forgotPasswordCopy : t.resendActivationCopy}</p>
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <FormField
            error={errors.email}
            label={t.email}
            type="email"
            value={email}
            onChange={setEmail}
          />
          <button className="form-submit" type="submit" disabled={isSubmitting}>
            {isForgotPassword ? t.sendResetLink : t.resendEmail}
          </button>
        </form>
        <AuthSwitch actionLabel={t.backToLogin} onClick={onBackLogin} />
      </div>
    </AuthLayout>
  )
}
