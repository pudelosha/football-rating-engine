import { useEffect, useRef, useState } from 'react'
import type { Language } from '../../../shared/types'
import { AuthLayout } from '../components/AuthLayout'
import { AuthSwitch } from '../components/AuthSwitch'
import { confirmEmailAddress } from '../services/authService'
import type { AuthToastHandler, AuthTranslation, ConfirmationStatus } from '../types'

export function ConfirmEmailPage({
  t,
  language,
  search,
  onBackLogin,
  onResendActivation,
  onToast,
}: {
  t: AuthTranslation
  language: Language
  search: string
  onBackLogin: () => void
  onResendActivation: () => void
  onToast: AuthToastHandler
}) {
  const [status, setStatus] = useState<ConfirmationStatus>('loading')
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

    confirmEmailAddress(userId, token, language)
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
    <AuthLayout isProcessing={isLoading} loadingLabel={t.loading}>
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
          <AuthSwitch actionLabel={t.backToLogin} onClick={onBackLogin} />
        )}
      </div>
    </AuthLayout>
  )
}
