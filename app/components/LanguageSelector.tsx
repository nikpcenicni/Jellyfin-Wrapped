'use client'

import { useLocale } from 'next-intl'
import { locales, type Locale } from '../providers'

export default function LanguageSelector() {
  const locale = useLocale() as Locale

  const handleLocaleChange = (newLocale: string) => {
    // Store preference
    localStorage.setItem('jellyfin_locale', newLocale)
    
    // Reload to apply new locale
    window.location.reload()
  }

  return (
    <select
      value={locale}
      onChange={(e) => handleLocaleChange(e.target.value)}
      className="px-3 py-2 bg-gray-800/80 backdrop-blur-sm text-white rounded-lg border border-gray-700 hover:border-jellyfin-blue focus:outline-none focus:ring-2 focus:ring-jellyfin-blue transition-all cursor-pointer text-sm font-medium uppercase tracking-wide"
      aria-label="Select language"
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {loc}
        </option>
      ))}
    </select>
  )
}
