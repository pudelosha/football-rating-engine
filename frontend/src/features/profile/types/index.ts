import type { translations } from '../../../i18n'
import type { AuthUser, Language, ToastTone } from '../../../shared/types'

export type ProfileTranslation = (typeof translations)[Language]
export type ProfileToastHandler = (message: string, tone: ToastTone) => void
export type ProfileSessionExpiredHandler = () => void
export type ProfileUser = AuthUser
export type ProfileSubmitTarget = 'profile' | 'email' | 'password' | 'apiKey'
