import type { translations } from '../../../i18n'
import type { AuthUser, Language, ToastTone } from '../../../shared/types'

export type AuthTranslation = (typeof translations)[Language]

export type AuthToastHandler = (message: string, tone: ToastTone) => void

export type AuthSuccessHandler = (user: AuthUser) => void

export type AuthMode = 'login' | 'register'

export type EmailActionMode = 'forgot-password' | 'resend-activation'

export type ConfirmationStatus = 'loading' | 'success' | 'failure'
