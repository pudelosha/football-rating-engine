import type { translations } from '../../../i18n'
import type { AuthUser, Language, ToastTone } from '../../../shared/types'

export type RatingsTranslation = (typeof translations)[Language]
export type RatingsToastHandler = (message: string, tone: ToastTone) => void
export type RatingsUser = AuthUser
export type OpenRatingTournamentHandler = (id: number) => void
export type BackToRatingsHandler = () => void
