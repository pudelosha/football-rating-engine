import { type FormEvent, useEffect, useState } from 'react'
import { FullPageProcessingOverlay } from '../../../shared/components/Spinner'
import type { FieldErrors, Language, UserProfile } from '../../../shared/types'
import { ApiKeyPanel } from '../components/ApiKeyPanel'
import { ApiKeyRotationModal } from '../components/ApiKeyRotationModal'
import { ChangeEmailForm } from '../components/ChangeEmailForm'
import { ChangePasswordForm } from '../components/ChangePasswordForm'
import { ProfileDetailsForm } from '../components/ProfileDetailsForm'
import {
  fetchProfile,
  rotateApiKey,
  updateEmail,
  updatePassword,
  updateProfile,
} from '../services/profileService'
import {
  validateEmailChangeForm,
  validatePasswordChangeForm,
} from '../model/profileValidation'
import type {
  ProfileSessionExpiredHandler,
  ProfileSubmitTarget,
  ProfileToastHandler,
  ProfileTranslation,
  ProfileUser,
} from '../types'

export function ProfilePage({
  t,
  language,
  user,
  onSessionExpired,
  onToast,
}: {
  t: ProfileTranslation
  language: Language
  user: ProfileUser
  onSessionExpired: ProfileSessionExpiredHandler
  onToast: ProfileToastHandler
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
  const [isSubmitting, setIsSubmitting] = useState<ProfileSubmitTarget | null>(null)

  useEffect(() => {
    let isMounted = true

    fetchProfile(user.token)
      .then((result) => {
        if (!isMounted) {
          return
        }

        if (handleUnauthorized(result.status)) {
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
      const result = await updateProfile(user.token, displayName, language)

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
    const nextErrors = validatePasswordChangeForm({
      currentPassword,
      newPassword,
      confirmNewPassword,
      t,
    })

    setPasswordErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSubmitting('password')
    try {
      const result = await updatePassword(user.token, currentPassword, newPassword, language)

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
    const nextErrors = validateEmailChangeForm(newEmail, emailPassword, t)

    setEmailErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      onToast(t.validationFailed, 'error')
      return
    }

    setIsSubmitting('email')
    try {
      const result = await updateEmail(user.token, newEmail, emailPassword, language)

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

  const handleRotateApiKey = async () => {
    setIsSubmitting('apiKey')
    try {
      const result = await rotateApiKey(user.token, language)

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
          <ProfileDetailsForm
            displayName={displayName}
            isSubmitting={isSubmitting}
            profile={profile}
            t={t}
            user={user}
            onDisplayNameChange={setDisplayName}
            onSubmit={saveProfile}
          />

          <ChangeEmailForm
            emailErrors={emailErrors}
            emailPassword={emailPassword}
            isSubmitting={isSubmitting}
            newEmail={newEmail}
            t={t}
            onEmailChange={setNewEmail}
            onPasswordChange={setEmailPassword}
            onSubmit={changeEmail}
          />

          <ChangePasswordForm
            confirmNewPassword={confirmNewPassword}
            currentPassword={currentPassword}
            isSubmitting={isSubmitting}
            newPassword={newPassword}
            passwordErrors={passwordErrors}
            t={t}
            onConfirmNewPasswordChange={setConfirmNewPassword}
            onCurrentPasswordChange={setCurrentPassword}
            onNewPasswordChange={setNewPassword}
            onSubmit={changePassword}
          />

          <ApiKeyPanel
            isApiKeyVisible={isApiKeyVisible}
            isSubmitting={isSubmitting}
            newApiKey={newApiKey}
            t={t}
            onRevealToggle={() => setIsApiKeyVisible((current) => !current)}
            onRotateClick={() => setIsRotateApiKeyModalOpen(true)}
          />
        </section>

        {isRotateApiKeyModalOpen && (
          <ApiKeyRotationModal
            t={t}
            isRotating={isSubmitting === 'apiKey'}
            onCancel={() => setIsRotateApiKeyModalOpen(false)}
            onConfirm={() => {
              setIsRotateApiKeyModalOpen(false)
              handleRotateApiKey()
            }}
          />
        )}
      </div>
    </section>
  )
}
