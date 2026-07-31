import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { confirmEmail, postAuth, resetPassword } from '../../../shared/api/authApi'
import { FormField } from '../../../shared/components/FormField/FormField'
import { HeroField } from '../../../shared/components/HeroField/HeroField'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import type { AuthUser, FieldErrors, Language, ToastTone } from '../../../shared/types'
import { validateEmail, validatePassword } from '../../../shared/utils/validation'
import { translations } from '../../../i18n'

type Translation = (typeof translations)[Language]

type ToastHandler = (message: string, tone: ToastTone) => void

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
  mode: 'login' | 'register'
  language: Language
  t: Translation
  onSwitch: () => void
  onToast: ToastHandler
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
    const nextErrors: FieldErrors = {
      email: validateEmail(email, t),
      password: validatePassword(password, t),
    }

    if (mode === 'register') {
      if (!confirmPassword) {
        nextErrors.confirmPassword = t.required
      } else if (password !== confirmPassword) {
        nextErrors.confirmPassword = t.passwordMismatch
      }

      if (!termsAccepted) {
        nextErrors.termsAccepted = t.termsRequired
      }
    }

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key as keyof FieldErrors]) {
        delete nextErrors[key as keyof FieldErrors]
      }
    })

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
        const result = await postAuth('/api/auth/login', { email, password, language })
        if (!result.success || !result.token) {
          onToast(result.message || t.genericError, 'error')
          return
        }

        onLoginSuccess({ email, token: result.token })
        return
      }

      const result = await postAuth('/api/auth/register', {
        email,
        password,
        displayName: null,
        language,
      })
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
    <>
      {isSubmitting && <FullPageProcessingOverlay label={t.loading} />}
      <section className="auth-section">
        <HeroField />
        <div className="hero-shade" />
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
              <label className="terms-field">
                <span className="terms-row">
                  <span className="terms-control">
                    <input
                      checked={termsAccepted}
                      type="checkbox"
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                    />
                    <span>
                      {t.acceptTermsPrefix} <Link to="/terms">{t.termsAndConditions}</Link>
                    </span>
                  </span>
                  {errors.termsAccepted && <small>{errors.termsAccepted}</small>}
                </span>
              </label>
            )}
            <button className="form-submit" type="submit" disabled={isSubmitting}>
              {mode === 'login' ? t.submitLogin : t.submitRegister}
            </button>
          </form>
          <div className="auth-switch">
            <span>{mode === 'login' ? t.noAccount : t.hasAccount}</span>
            <button type="button" onClick={onSwitch}>
              {mode === 'login' ? t.createAccount : t.useExisting}
            </button>
          </div>
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
      </section>
    </>
  )
}

export function EmailActionPage({
  mode,
  language,
  t,
  onBackLogin,
  onToast,
}: {
  mode: 'forgot-password' | 'resend-activation'
  language: Language
  t: Translation
  onBackLogin: () => void
  onToast: ToastHandler
}) {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isForgotPassword = mode === 'forgot-password'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const emailError = validateEmail(email, t)
    setErrors(emailError ? { email: emailError } : {})

    if (emailError) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await postAuth(
        isForgotPassword ? '/api/auth/request-password-reset' : '/api/auth/resend-confirmation-email',
        { email, language },
      )

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
    <>
      {isSubmitting && <FullPageProcessingOverlay label={t.loading} />}
      <section className="auth-section">
        <HeroField />
        <div className="hero-shade" />
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
          <div className="auth-switch">
            <button type="button" onClick={onBackLogin}>
              {t.backToLogin}
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

export function ConfirmEmailPage({
  t,
  language,
  search,
  onBackLogin,
  onResendActivation,
  onToast,
}: {
  t: Translation
  language: Language
  search: string
  onBackLogin: () => void
  onResendActivation: () => void
  onToast: ToastHandler
}) {
  const [status, setStatus] = useState<'loading' | 'success' | 'failure'>('loading')
  const [message, setMessage] = useState('')
  const hasRequested = useRef(false)

  useEffect(() => {
    if (hasRequested.current) {
      return
    }

    hasRequested.current = true
    const params = new URLSearchParams(search)
    const userId = params.get('userId')
    const token = params.get('token')

    if (!userId || !token) {
      setStatus('failure')
      setMessage(t.confirmEmailFailureCopy)
      onToast(t.confirmEmailFailureTitle, 'error')
      return
    }

    confirmEmail(userId, token, language)
      .then((result) => {
        if (result.success) {
          setStatus('success')
          setMessage(result.message || t.confirmEmailSuccessCopy)
          onToast(result.message || t.confirmEmailSuccessTitle, 'success')
          return
        }

        setStatus('failure')
        setMessage(result.message || t.confirmEmailFailureCopy)
        onToast(result.message || t.confirmEmailFailureTitle, 'error')
      })
      .catch(() => {
        setStatus('failure')
        setMessage(t.genericError)
        onToast(t.genericError, 'error')
      })
  }, [language, onToast, search, t])

  const isLoading = status === 'loading'
  const isSuccess = status === 'success'
  const title = isLoading
    ? t.confirmEmailLoadingTitle
    : isSuccess
      ? t.confirmEmailSuccessTitle
      : t.confirmEmailFailureTitle
  const copy = isLoading
    ? t.confirmEmailLoadingCopy
    : message || (isSuccess ? t.confirmEmailSuccessCopy : t.confirmEmailFailureCopy)

  return (
    <>
      {isLoading && <FullPageProcessingOverlay label={t.loading} />}
      <section className="auth-section">
        <HeroField />
        <div className="hero-shade" />
        <div className={`auth-card status-card ${status}`}>
          <p className="eyebrow">{t.confirmEmailEyebrow}</p>
          <h1>{title}</h1>
          <p className="auth-copy">{copy}</p>
          {!isLoading && (
            <button
              className="form-submit"
              type="button"
              onClick={isSuccess ? onBackLogin : onResendActivation}
            >
              {isSuccess ? t.backToLogin : t.goToResendActivation}
            </button>
          )}
          {!isLoading && !isSuccess && (
            <div className="auth-switch">
              <button type="button" onClick={onBackLogin}>
                {t.backToLogin}
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export function ResetPasswordPage({
  t,
  language,
  search,
  onBackLogin,
  onToast,
}: {
  t: Translation
  language: Language
  search: string
  onBackLogin: () => void
  onToast: ToastHandler
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
    const nextErrors: FieldErrors = {
      password: validatePassword(password, t),
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = t.required
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = t.passwordMismatch
    }

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key as keyof FieldErrors]) {
        delete nextErrors[key as keyof FieldErrors]
      }
    })

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
      const result = await resetPassword(userId, token, password, language)

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
    <>
      {isSubmitting && <FullPageProcessingOverlay label={t.loading} />}
      <section className="auth-section">
        <HeroField />
        <div className="hero-shade" />
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
          <div className="auth-switch">
            <button type="button" onClick={onBackLogin}>
              {t.backToLogin}
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
