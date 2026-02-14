import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import en from './translations/en.json'
import ru from './translations/ru.json'

type Language = 'en' | 'ru'
type Translations = typeof en

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
  toggleLanguage: () => void
}

const translations: Record<Language, Translations> = { en, ru }

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('language') as Language
    return saved || 'en'
  })

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }, [])

  const toggleLanguage = useCallback(() => {
    const newLang = language === 'en' ? 'ru' : 'en'
    setLanguage(newLang)
  }, [language, setLanguage])

  const t = useCallback(
    (key: string): string => {
      const keys = key.split('.')
      let value: unknown = translations[language]
      
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k]
        } else {
          return key // Return key if translation not found
        }
      }
      
      return typeof value === 'string' ? value : key
    },
    [language]
  )

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  return context
}
