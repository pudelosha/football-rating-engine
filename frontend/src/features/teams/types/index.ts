import type { translations } from '../../../i18n'
import type { AuthUser, Language, MatchSummary, ToastTone } from '../../../shared/types'

export type TeamsTranslation = (typeof translations)[Language]
export type TeamsToastHandler = (message: string, tone: ToastTone) => void
export type TeamsUser = AuthUser
export type OpenTeamHandler = (id: number) => void
export type BackToTeamsHandler = () => void
export type OpenRatingsHandler = (tournamentId: number) => void
export type TeamMatchWithTournament = MatchSummary & { tournamentName: string }
export type UpcomingLimit = '5' | '10' | '25' | 'all'
