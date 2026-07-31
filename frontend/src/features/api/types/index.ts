import type { translations } from '../../../i18n'
import type { AuthUser, Language, ToastTone } from '../../../shared/types'

export type ApiTranslation = (typeof translations)[Language]
export type ApiUserSession = AuthUser
export type ApiToastHandler = (message: string, tone: ToastTone) => void

export type ApiEndpointExample = {
  key: string
  label: string
  endpoint: string
  request: unknown
  response: unknown
}
