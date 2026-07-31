import type { translations } from '../../../i18n'
import type { AuthUser, Language, ToastTone } from '../../../shared/types'

export type PredictionsTranslation = (typeof translations)[Language]
export type PredictionsToastHandler = (message: string, tone: ToastTone) => void
export type PredictionsUser = AuthUser
export type OpenPredictionTournamentHandler = (id: number) => void
export type OpenPredictionMatchHandler = (matchId: number) => void
export type BackHandler = () => void
export type BackToPredictionTournamentHandler = (tournamentId: number) => void
