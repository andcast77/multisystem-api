import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'

// Default language
const DEFAULT_LANGUAGE = 'es'

// Supported languages
export const SUPPORTED_LANGUAGES = ['es', 'en'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

// Get language from cookie or use default
async function getLanguage(): Promise<SupportedLanguage> {
  const cookieStore = await cookies()
  const languageCookie = cookieStore.get('language')?.value

  if (languageCookie && SUPPORTED_LANGUAGES.includes(languageCookie as SupportedLanguage)) {
    return languageCookie as SupportedLanguage
  }

  return DEFAULT_LANGUAGE
}

export default getRequestConfig(async () => {
  const locale = await getLanguage()

  return {
    locale,
    messages: (await import(`@/locales/${locale}.json`)).default,
  }
})
