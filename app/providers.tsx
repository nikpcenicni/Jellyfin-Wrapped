'use client'

import { useEffect, useState } from 'react'
import { NextIntlClientProvider } from 'next-intl'
export const locales = ['en', 'es', 'fr', 'de'] as const
export type Locale = (typeof locales)[number]
import en from '../messages/en.json'
import es from '../messages/es.json'
import fr from '../messages/fr.json'
import de from '../messages/de.json'

const messages = { en, es, fr, de }

function getLocale(): string {
  if (typeof window === 'undefined') {
    return 'en'
  }
  
  // Check localStorage first
  const saved = localStorage.getItem('jellyfin_locale')
  if (saved && locales.includes(saved as any)) {
    return saved
  }
  
  // Detect from browser
  const browserLang = navigator.language || (navigator as any).userLanguage || 'en'
  const langCode = browserLang.split('-')[0].toLowerCase()
  
  if (locales.includes(langCode as any)) {
    return langCode
  }
  
  return 'en'
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<string>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const detected = getLocale()
    setLocale(detected)
    setMounted(true)
    
    // Update HTML lang attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = detected
    }
  }, [])

  // Always provide a provider, even during SSR, using default locale
  const currentLocale = mounted ? locale : 'en'
  const currentMessages = messages[currentLocale as keyof typeof messages] || messages.en

  return (
    <NextIntlClientProvider locale={currentLocale} messages={currentMessages}>
      {children}
    </NextIntlClientProvider>
  )
}

