import './globals.css'
import { Inter } from 'next/font/google'
import { LocaleProvider } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Jellyfin Wrapped',
  description: 'Your Year in Review - Jellyfin Statistics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html suppressHydrationWarning>
      <body className={inter.className}>
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </body>
    </html>
  )
}
