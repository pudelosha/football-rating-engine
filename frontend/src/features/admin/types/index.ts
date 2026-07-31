import type { translations } from '../../../i18n'
import type { AuthUser, Language, ToastTone, View } from '../../../shared/types'

export type AdminTranslation = (typeof translations)[Language]
export type AdminUserSession = AuthUser
export type AdminToastHandler = (message: string, tone: ToastTone) => void
export type AdminNavigateHandler = (view: View) => void
export type AdminBackHandler = () => void
export type AdminOpenIdHandler = (id: number) => void
