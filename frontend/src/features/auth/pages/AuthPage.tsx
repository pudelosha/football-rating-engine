import { type FormEvent, useState } from 'react'
import { FormField } from '../../../shared/components/FormField/FormField'
import type { AuthUser, FieldErrors, Language } from '../../../shared/types'
import { AuthLayout } from '../components/AuthLayout'
import { AuthSwitch } from '../components/AuthSwitch'
import { TermsAcceptance } from '../components/TermsAcceptance'
import { validateLoginForm, validateRegisterForm } from '../model/authValidation'
import { login, register } from '../services/authService'
import type { AuthMode, AuthToastHandler, AuthTranslation } from '../types'

export function AuthPage({
  mode,
  language,
  t,
  onSwitch,
  onToast,
  onLoginSuccess,
  onForgotPassword,
  onResendActivation,
}: {
  mode: AuthMode
  language: Language
  t: AuthTranslation
  onSwitch: () => void
  onToast: AuthToastHandler
  onLoginSuccess: (user: AuthUser) => void
  onForgotPassword?: () => void
  onResendActivation?: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = () => {
    const nextErrors = mode === 'login'
      ? validateLoginForm(email, password, t)
      : validateRegisterForm({ email, password, confirmPassword, termsAccepted, t })

    setErrors(nextErrors)
    const isValid = Object.keys(nextErrors).length === 0
    if (!isValid) {
      onToast(t.validationFailed, 'error')
    }

    return isValid
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        const result = await login(email, password, language)
        if (!result.success || !result.token) {
          onToast(result.message || t.genericError, 'error')
          return
        }

        onLoginSuccess({ email, token: result.token })
        return
      }

      const result = await register(email, password, language)
      if (!result.success) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      onToast(result.message || t.registerSuccess, 'success')
      onSwitch()
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout isProcessing={isSubmitting} loadingLabel={t.loading}>
      <div className="auth-card">
        <p className="eyebrow">{mode === 'login' ? t.submitLogin : t.submitRegister}</p>
        <h1>{mode === 'login' ? t.loginTitle : t.registerTitle}</h1>
        <p className="auth-copy">{mode === 'login' ? t.loginCopy : t.registerCopy}</p>
        <form className="auth-form" noValidate onSubmit={handleSubmit}>
          <FormField
            error={errors.email}
            label={t.email}
            type="email"
            value={email}
            onChange={setEmail}
          />
          <FormField
            error={errors.password}
            label={t.password}
            type="password"
            value={password}
            onChange={setPassword}
          />
          {mode === 'register' && (
            <FormField
              error={errors.confirmPassword}
              label={t.confirmPassword}
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
            />
          )}
          {mode === 'register' && (
            <TermsAcceptance
              checked={termsAccepted}
              error={errors.termsAccepted}
              prefix={t.acceptTermsPrefix}
              linkText={t.termsAndConditions}
              onChange={setTermsAccepted}
            />
          )}
          <button className="form-submit" type="submit" disabled={isSubmitting}>
            {mode === 'login' ? t.submitLogin : t.submitRegister}
          </button>
        </form>
        <AuthSwitch
          label={mode === 'login' ? t.noAccount : t.hasAccount}
          actionLabel={mode === 'login' ? t.createAccount : t.useExisting}
          onClick={onSwitch}
        />
        {mode === 'login' && (
          <div className="auth-links">
            <button type="button" onClick={onForgotPassword}>
              {t.forgotPassword}
            </button>
            <button type="button" onClick={onResendActivation}>
              {t.resendActivation}
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}
