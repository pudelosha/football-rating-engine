import { type FormEvent, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { authorizedRequest } from '../../../shared/api/httpClient'
import { FormField } from '../../../shared/components/FormField/FormField'
import { MenuIcon } from '../../../shared/components/Icons'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import { translations } from '../../../i18n'
import type { AuthActionResponse, AuthUser, FieldErrors, Language, RotateApiKeyResponse, ToastTone, UserProfile } from '../../../shared/types'
import { validateEmail, validatePassword } from '../../../shared/utils/validation'

export function ProfilePage({
  t,
  language,
  user,
  onSessionExpired,
  onToast,
}: {
  t: (typeof translations)[Language]
  language: Language
  user: AuthUser
  onSessionExpired: () => void
  onToast: (message: string, tone: ToastTone) => void
}) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState(user.displayName ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [newEmail, setNewEmail] = useState(user.email)
  const [emailPassword, setEmailPassword] = useState('')
  const [newApiKey, setNewApiKey] = useState('')
  const [isApiKeyVisible, setIsApiKeyVisible] = useState(false)
  const [isRotateApiKeyModalOpen, setIsRotateApiKeyModalOpen] = useState(false)
  const [passwordErrors, setPasswordErrors] = useState<FieldErrors>({})
  const [emailErrors, setEmailErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    authorizedRequest<UserProfile>(user.token, '/api/users/me')
      .then((result) => {
        if (!isMounted) {
          return
        }

        if (result.status === 401) {
          onToast(t.sessionExpired, 'error')
          onSessionExpired()
          return
        }

        if (!result.ok || !result.data) {
          onToast(result.message || t.profileLoadFailed, 'error')
          return
        }

        setProfile(result.data)
        setDisplayName(result.data.displayName ?? '')
        setNewEmail(result.data.email)
      })
      .catch(() => {
        if (isMounted) {
          onToast(t.profileLoadFailed, 'error')
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [onSessionExpired, onToast, t, user.token])

  const handleUnauthorized = (status: number) => {
    if (status === 401) {
      onToast(t.sessionExpired, 'error')
      onSessionExpired()
      return true
    }

    return false
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting('profile')
    try {
      const result = await authorizedRequest<AuthActionResponse>(user.token, '/api/users/me', {
        method: 'PUT',
        body: JSON.stringify({ displayName: displayName.trim() || null, language }),
      })

      if (handleUnauthorized(result.status)) {
        return
      }

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setProfile((current) => current ? { ...current, displayName: displayName.trim() || null } : current)
      onToast(result.data?.message || t.profileSaved, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(null)
    }
  }

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: FieldErrors = {
      password: validatePassword(newPassword, t),
    }

    if (!currentPassword) {
      nextErrors.currentPassword = t.required
    } else if (!confirmNewPassword) {
      nextErrors.confirmPassword = t.required
    } else if (newPassword !== confirmNewPassword) {
      nextErrors.confirmPassword = t.passwordMismatch
    }

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key as keyof FieldErrors]) {
        delete nextErrors[key as keyof FieldErrors]
      }
    })

    setPasswordErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSubmitting('password')
    try {
      const result = await authorizedRequest<AuthActionResponse>(user.token, '/api/users/me/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, language }),
      })

      if (handleUnauthorized(result.status)) {
        return
      }

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setPasswordErrors({})
      onToast(result.data?.message || t.passwordChanged, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(null)
    }
  }

  const changeEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const emailError = validateEmail(newEmail, t)
    if (emailError || !emailPassword) {
      setEmailErrors({ email: emailError, password: emailPassword ? undefined : t.required })
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSubmitting('email')
    try {
      const result = await authorizedRequest<AuthActionResponse>(user.token, '/api/users/me/change-email', {
        method: 'POST',
        body: JSON.stringify({ newEmail, password: emailPassword, language }),
      })

      if (handleUnauthorized(result.status)) {
        return
      }

      if (!result.ok) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setProfile((current) => current ? { ...current, email: newEmail } : current)
      setEmailPassword('')
      setEmailErrors({})
      onToast(result.data?.message || t.emailChanged, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(null)
    }
  }

  const rotateApiKey = async () => {
    setIsSubmitting('apiKey')
    try {
      const params = new URLSearchParams({ language })
      const result = await authorizedRequest<RotateApiKeyResponse>(user.token, `/api/users/me/rotate-api-key?${params}`, {
        method: 'POST',
      })

      if (handleUnauthorized(result.status)) {
        return
      }

      if (!result.ok || !result.data) {
        onToast(result.message || t.genericError, 'error')
        return
      }

      setNewApiKey(result.data.apiKey)
      setIsApiKeyVisible(false)
      onToast(result.data.message || t.apiKeyRotated, 'success')
    } catch {
      onToast(t.genericError, 'error')
    } finally {
      setIsSubmitting(null)
    }
  }

  return (
    <section className="admin-dashboard">
      <div className="admin-dashboard-content profile-panel-layout">
        <div className="admin-dashboard-hero">
          <p className="eyebrow">{t.profileEyebrow}</p>
          <h1>{t.profileTitle}</h1>
          <p>{t.profileCopy}</p>
        </div>

        {(isLoading || isSubmitting) && (
          <FullPageProcessingOverlay label={t.loading} />
        )}

        <section className="profile-settings-grid">
          <form className="details-panel profile-form-panel" noValidate onSubmit={saveProfile}>
            <div className="details-panel-heading">
              <MenuIcon name="profile" />
              <h2>{t.profile}</h2>
            </div>
            <div className="profile-summary-grid">
              <ProfileSummaryItem label={t.email} value={profile?.email ?? user.email} />
              <ProfileSummaryItem label={t.displayName} value={profile?.displayName || '-'} />
              <ProfileSummaryItem label={t.memberSince} value={profile ? new Date(profile.memberSinceUtc).toLocaleDateString() : '-'} />
              <ProfileSummaryItem label={t.apiKeyIssued} value={profile ? new Date(profile.apiKeyCreatedAtUtc).toLocaleDateString() : '-'} />
            </div>
            <FormField
              label={t.displayName}
              type="text"
              value={displayName}
              onChange={setDisplayName}
            />
            <button className="form-submit" type="submit" disabled={isSubmitting === 'profile'}>
              {t.saveProfile}
            </button>
          </form>

          <form className="details-panel profile-form-panel" noValidate onSubmit={changeEmail}>
            <div className="details-panel-heading">
              <MenuIcon name="api" />
              <h2>{t.changeEmailTitle}</h2>
            </div>
            <FormField
              error={emailErrors.email}
              label={t.newEmail}
              type="email"
              value={newEmail}
              onChange={setNewEmail}
            />
            <FormField
              error={emailErrors.password}
              label={t.password}
              type="password"
              value={emailPassword}
              onChange={setEmailPassword}
            />
            <button className="form-submit" type="submit" disabled={isSubmitting === 'email'}>
              {t.changeEmail}
            </button>
          </form>

          <form className="details-panel profile-form-panel" noValidate onSubmit={changePassword}>
            <div className="details-panel-heading">
              <MenuIcon name="admin" />
              <h2>{t.changePasswordTitle}</h2>
            </div>
            <FormField
              error={passwordErrors.currentPassword}
              label={t.currentPassword}
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
            />
            <FormField
              error={passwordErrors.password}
              label={t.newPassword}
              type="password"
              value={newPassword}
              onChange={setNewPassword}
            />
            <FormField
              error={passwordErrors.confirmPassword}
              label={t.confirmNewPassword}
              type="password"
              value={confirmNewPassword}
              onChange={setConfirmNewPassword}
            />
            <button className="form-submit" type="submit" disabled={isSubmitting === 'password'}>
              {t.changePassword}
            </button>
          </form>

          <section className="details-panel profile-form-panel api-key-panel">
            <div className="details-panel-heading">
              <MenuIcon name="api" />
              <h2>{t.rotateApiKeyTitle}</h2>
            </div>
            <div className="api-key-purpose">
              <strong>{t.apiKeyPurposeTitle}</strong>
              <p>{t.apiKeyPurposeCopy}</p>
            </div>
            <div className="api-key-current">
              <span>{t.currentApiKey}</span>
              <code>{newApiKey && isApiKeyVisible ? newApiKey : '********************************'}</code>
              <small>{newApiKey ? t.newApiKey : t.apiKeyHidden}</small>
            </div>
            <div className="profile-api-actions">
              <button className="form-submit secondary" type="button" disabled={!newApiKey} onClick={() => setIsApiKeyVisible((current) => !current)}>
                {isApiKeyVisible ? t.hideApiKey : t.revealApiKey}
              </button>
              <button className="form-submit" type="button" disabled={isSubmitting === 'apiKey'} onClick={() => setIsRotateApiKeyModalOpen(true)}>
                {t.rotateApiKey}
              </button>
            </div>
          </section>
        </section>

        {isRotateApiKeyModalOpen && (
          <ApiKeyRotationModal
            t={t}
            isRotating={isSubmitting === 'apiKey'}
            onCancel={() => setIsRotateApiKeyModalOpen(false)}
            onConfirm={() => {
              setIsRotateApiKeyModalOpen(false)
              rotateApiKey()
            }}
          />
        )}
      </div>
    </section>
  )
}

function ProfileSummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <span className="profile-summary-item">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  )
}

function ApiKeyRotationModal({
  t,
  isRotating,
  onCancel,
  onConfirm,
}: {
  t: (typeof translations)[Language]
  isRotating: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isRotating) {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isRotating, onCancel])

  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={() => !isRotating && onCancel()}>
      <section
        className="delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rotate-api-key-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <MenuIcon name="api" />
        </div>
        <div className="delete-modal-copy">
          <p className="eyebrow">{t.rotateApiKeyTitle}</p>
          <h2 id="rotate-api-key-title">{t.rotateApiKeyConfirmTitle}</h2>
          <p>{t.rotateApiKeyConfirmCopy}</p>
          <div className="delete-modal-target">
            <strong>{t.apiKeyPurposeTitle}</strong>
            <span>{t.apiKeyPurposeCopy}</span>
          </div>
        </div>
        <div className="delete-modal-actions">
          <button type="button" disabled={isRotating} onClick={onCancel}>
            {t.cancel}
          </button>
          <button className="danger" type="button" disabled={isRotating} onClick={onConfirm}>
            {isRotating ? '...' : t.rotateApiKeyConfirmAction}
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
