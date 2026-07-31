import type { translations } from '../../../i18n'
import type { AuthUser, Language, ToastTone } from '../../../shared/types'

export type BettingTranslation = (typeof translations)[Language]
export type BettingToastHandler = (message: string, tone: ToastTone) => void
export type BettingUser = AuthUser
export type BettingNavigationHandler = () => void
