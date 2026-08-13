import { type FormEvent, useMemo, useState } from 'react'
import { FormField } from '../../../shared/components/FormField/FormField'
import type { FieldErrors, Language } from '../../../shared/types'
import { AuthLayout } from '../components/AuthLayout'
import { AuthSwitch } from '../components/AuthSwitch'
import { validateResetPasswordForm } from '../model/authValidation'
import { acceptBettingInvitation } from '../services/authService'
import type { AuthToastHandler, AuthTranslation } from '../types'

export function BettingInvitePage({
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
  const [isAccepted, setIsAccepted] = useState(false)

  const params = useMemo(() => new URLSearchParams(search), [search])
  const participantId = Number(params.get('participantId') ?? 0)
  const token = params.get('token')
  const isLinkValid = participantId > 0 && Boolean(token)

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

    if (!isLinkValid || !token) {
      onToast('Invitation link is invalid or expired.', 'error')
      return
    }

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await acceptBettingInvitation(participantId, token, password, language)
      if (!result.success) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setIsAccepted(true)
      onToast(result.message || 'Invitation accepted.', 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout isProcessing={isSubmitting} loadingLabel={t.loading}>
      <div className="auth-card">
        <p className="eyebrow">Invitation</p>
        <h1>{isAccepted ? 'You are in.' : 'Join the tournament.'}</h1>
        <p className="auth-copy">
          {isAccepted
            ? 'Your account is confirmed and the invitation has been accepted. Sign in to open your social betting tournament.'
            : isLinkValid
              ? 'Set your password to confirm your account and join the private prediction tournament.'
              : 'This invitation link is invalid or incomplete. Ask the tournament admin to send a new invitation.'}
        </p>

        {!isAccepted && (
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
              Accept invitation
            </button>
          </form>
        )}

        <AuthSwitch actionLabel={t.backToLogin} onClick={onBackLogin} />
      </div>
    </AuthLayout>
  )
}
