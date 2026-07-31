import type { FormEvent } from 'react'
import { FormField } from '../../../shared/components/FormField/FormField'
import { MenuIcon } from '../../../shared/components/Icons'
import type { FieldErrors } from '../../../shared/types'
import type { ProfileSubmitTarget, ProfileTranslation } from '../types'

export function ChangePasswordForm({
  confirmNewPassword,
  currentPassword,
  isSubmitting,
  newPassword,
  passwordErrors,
  t,
  onConfirmNewPasswordChange,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onSubmit,
}: {
  confirmNewPassword: string
  currentPassword: string
  isSubmitting: ProfileSubmitTarget | null
  newPassword: string
  passwordErrors: FieldErrors
  t: ProfileTranslation
  onConfirmNewPasswordChange: (value: string) => void
  onCurrentPasswordChange: (value: string) => void
  onNewPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="details-panel profile-form-panel" noValidate onSubmit={onSubmit}>
      <div className="details-panel-heading">
        <MenuIcon name="admin" />
        <h2>{t.changePasswordTitle}</h2>
      </div>
      <FormField
        error={passwordErrors.currentPassword}
        label={t.currentPassword}
        type="password"
        value={currentPassword}
        onChange={onCurrentPasswordChange}
      />
      <FormField
        error={passwordErrors.password}
        label={t.newPassword}
        type="password"
        value={newPassword}
        onChange={onNewPasswordChange}
      />
      <FormField
        error={passwordErrors.confirmPassword}
        label={t.confirmNewPassword}
        type="password"
        value={confirmNewPassword}
        onChange={onConfirmNewPasswordChange}
      />
      <button className="form-submit" type="submit" disabled={isSubmitting === 'password'}>
        {t.changePassword}
      </button>
    </form>
  )
}
