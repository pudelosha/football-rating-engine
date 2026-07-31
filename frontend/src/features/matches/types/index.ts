import type { translations } from '../../../i18n'
import type { AuthUser, Language, ToastTone } from '../../../shared/types'

export type MatchesTranslation = (typeof translations)[Language]
export type MatchesToastHandler = (message: string, tone: ToastTone) => void
export type MatchesUser = AuthUser
export type OpenTournamentHandler = (id: number) => void
export type BackHandler = () => void
