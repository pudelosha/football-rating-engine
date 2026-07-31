import type { FormEvent } from 'react'
import { FormField } from '../../../shared/components/FormField/FormField'
import { MenuIcon } from '../../../shared/components/Icons'
import type { FieldErrors } from '../../../shared/types'
import type { ProfileSubmitTarget, ProfileTranslation } from '../types'

export function ChangeEmailForm({
  emailErrors,
  emailPassword,
  isSubmitting,
  newEmail,
  t,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  emailErrors: FieldErrors
  emailPassword: string
  isSubmitting: ProfileSubmitTarget | null
  newEmail: string
  t: ProfileTranslation
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="details-panel profile-form-panel" noValidate onSubmit={onSubmit}>
      <div className="details-panel-heading">
        <MenuIcon name="api" />
        <h2>{t.changeEmailTitle}</h2>
      </div>
      <FormField
        error={emailErrors.email}
        label={t.newEmail}
        type="email"
        value={newEmail}
        onChange={onEmailChange}
      />
      <FormField
        error={emailErrors.password}
        label={t.password}
        type="password"
        value={emailPassword}
        onChange={onPasswordChange}
      />
      <button className="form-submit" type="submit" disabled={isSubmitting === 'email'}>
        {t.changeEmail}
      </button>
    </form>
  )
}
