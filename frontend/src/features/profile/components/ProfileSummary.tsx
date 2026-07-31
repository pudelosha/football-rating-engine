import type { UserProfile } from '../../../shared/types'
import type { ProfileTranslation, ProfileUser } from '../types'

export function ProfileSummary({
  profile,
  user,
  t,
}: {
  profile: UserProfile | null
  user: ProfileUser
  t: ProfileTranslation
}) {
  return (
    <div className="profile-summary-grid">
      <ProfileSummaryItem label={t.email} value={profile?.email ?? user.email} />
      <ProfileSummaryItem label={t.displayName} value={profile?.displayName || '-'} />
      <ProfileSummaryItem label={t.memberSince} value={profile ? new Date(profile.memberSinceUtc).toLocaleDateString() : '-'} />
      <ProfileSummaryItem label={t.apiKeyIssued} value={profile ? new Date(profile.apiKeyCreatedAtUtc).toLocaleDateString() : '-'} />
    </div>
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
