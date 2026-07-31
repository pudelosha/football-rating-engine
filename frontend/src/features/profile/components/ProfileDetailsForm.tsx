import type { FormEvent } from 'react'
import { FormField } from '../../../shared/components/FormField/FormField'
import { MenuIcon } from '../../../shared/components/Icons'
import type { UserProfile } from '../../../shared/types'
import type { ProfileSubmitTarget, ProfileTranslation, ProfileUser } from '../types'
import { ProfileSummary } from './ProfileSummary'

export function ProfileDetailsForm({
  displayName,
  isSubmitting,
  profile,
  t,
  user,
  onDisplayNameChange,
  onSubmit,
}: {
  displayName: string
  isSubmitting: ProfileSubmitTarget | null
  profile: UserProfile | null
  t: ProfileTranslation
  user: ProfileUser
  onDisplayNameChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form className="details-panel profile-form-panel" noValidate onSubmit={onSubmit}>
      <div className="details-panel-heading">
        <MenuIcon name="profile" />
        <h2>{t.profile}</h2>
      </div>
      <ProfileSummary profile={profile} user={user} t={t} />
      <FormField
        label={t.displayName}
        type="text"
        value={displayName}
        onChange={onDisplayNameChange}
      />
      <button className="form-submit" type="submit" disabled={isSubmitting === 'profile'}>
        {t.saveProfile}
      </button>
    </form>
  )
}
