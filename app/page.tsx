'use client'

import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { useTranslations } from 'next-intl'
import StatsDisplay from './components/StatsDisplay'
import LoginButton from './components/LoginButton'
import LanguageSelector from './components/LanguageSelector'
// Temporarily disabled reveal sequence
// import RevealSequence from './components/RevealSequence'

export const dynamic = 'force-dynamic'

interface Stats {
  year: number
  topMovies: any[]
  topShows: any[]
  monthlyActivity: any[]
  totalWatchTime: any[]
  mediaTypeComparison?: any[]
  preferredMediaType?: {
    type: string
    movies: {
      hours: number
      plays: number
      uniqueItems: number
    }
    shows: {
      hours: number
      plays: number
      uniqueItems: number
    }
  }
  topGenres?: Array<{ genre: string; count: number }> | null
  topMovieYears?: Array<{ year: number; count: number }> | null
}

export default function Home() {
  const t = useTranslations()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  // Temporarily disabled reveal sequence
  // const [revealComplete, setRevealComplete] = useState(false)
  // const [hasShownReveal, setHasShownReveal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showPersonalized, setShowPersonalized] = useState(false) // Will be set to true when authenticated

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const userStr = localStorage.getItem('jellyfin_user')
        const accessToken = localStorage.getItem('jellyfin_access_token')
        if (userStr && accessToken) {
          try {
            const user = JSON.parse(userStr)
            setIsAuthenticated(true)
            setUserName(user.name)
            setUserId(user.id)
            setShowPersonalized(true) // Default to personalized when authenticated
          } catch {
            // Invalid user data
            setIsAuthenticated(false)
            setUserId(null)
            setShowPersonalized(false)
          }
        } else {
          setIsAuthenticated(false)
          setUserId(null)
          setShowPersonalized(false)
        }
      }
    }
    checkAuth()

    // Listen for auth changes
    const handleAuthChange = () => {
      checkAuth()
    }
    window.addEventListener('jellyfin-auth-changed', handleAuthChange)

    return () => {
      window.removeEventListener('jellyfin-auth-changed', handleAuthChange)
    }
  }, [])

  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController for this request
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    fetchStats(signal)

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [year, isAuthenticated, showPersonalized])

  const fetchStats = async (signal: AbortSignal) => {
    try {
      setLoading(true)
      setError(null)

      // Check if user is authenticated
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('jellyfin_access_token') : null
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('jellyfin_user') : null
      const isUserAuthenticated = !!(accessToken && userStr)

      // Initialize stats object
      const initialStats: Stats = {
        year,
        topMovies: [],
        topShows: [],
        monthlyActivity: [],
        totalWatchTime: [],
        mediaTypeComparison: [],
        preferredMediaType: undefined,
        topGenres: null,
        topMovieYears: null
      }
      setStats(initialStats)

      const user = userStr ? JSON.parse(userStr) : null
      const userId = user?.id || null
      const authHeaders = accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}
      const userIdParam = userId ? `&userId=${userId}` : ''

      // Define stat endpoints in order of appearance
      const statEndpoints = [
        { key: 'totalWatchTime', url: `/api/stats/total-watch-time?year=${year}${userIdParam}` },
        { key: 'topMovies', url: `/api/stats/top-movies?year=${year}${userIdParam}` },
        { key: 'topShows', url: `/api/stats/top-shows?year=${year}${userIdParam}` },
        { key: 'mediaTypeComparison', url: `/api/stats/media-type-comparison?year=${year}${userIdParam}` },
        { key: 'monthlyActivity', url: `/api/stats/monthly-activity?year=${year}${userIdParam}` },
        { key: 'topGenres', url: `/api/stats/top-genres?year=${year}${userIdParam}` },
        { key: 'topMovieYears', url: `/api/stats/top-movie-years?year=${year}${userIdParam}` }
      ]

      // Fetch stats sequentially and update state as each completes
      for (const endpoint of statEndpoints) {
        if (signal.aborted) return

        try {
          const response = await axios.get(endpoint.url, {
            headers: authHeaders,
            signal
          })

          if (signal.aborted) return

          // Update stats progressively
          setStats(prev => {
            if (!prev) return prev
            const updated = { ...prev }
            
            if (endpoint.key === 'totalWatchTime') {
              updated.totalWatchTime = response.data.totalWatchTime || []
            } else if (endpoint.key === 'topMovies') {
              updated.topMovies = response.data.topMovies || []
            } else if (endpoint.key === 'topShows') {
              updated.topShows = response.data.topShows || []
            } else if (endpoint.key === 'mediaTypeComparison') {
              updated.mediaTypeComparison = response.data.mediaTypeComparison || []
              updated.preferredMediaType = response.data.preferredMediaType || undefined
            } else if (endpoint.key === 'monthlyActivity') {
              updated.monthlyActivity = response.data.monthlyActivity || []
            } else if (endpoint.key === 'topGenres') {
              updated.topGenres = response.data.topGenres
            } else if (endpoint.key === 'topMovieYears') {
              updated.topMovieYears = response.data.topMovieYears
            }
            
            return updated
          })
        } catch (endpointErr: any) {
          // Ignore request cancellation errors
          if (axios.isCancel(endpointErr) || endpointErr.code === 'ECONNABORTED' || endpointErr.code === 'ERR_CANCELED' || endpointErr.name === 'AbortError' || endpointErr.name === 'CanceledError') {
            return
          }
          console.warn(`Failed to fetch ${endpoint.key}:`, endpointErr)
          // Continue with next endpoint
        }
      }

      if (signal.aborted) return

      setLoading(false)
    } catch (err: any) {
      // Ignore request cancellation errors
      if (axios.isCancel(err) || err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED' || err.name === 'AbortError' || err.name === 'CanceledError') {
        return // Request was cancelled, don't update state
      }
      
      setError(err.response?.data?.message || t('home.errorLoading'))
      console.error('Error fetching stats:', err)
      setLoading(false)
    }
  }

  // Temporarily disabled reveal sequence
  // const handleRevealComplete = () => {
  //   setRevealComplete(true)
  // }

  return (
    <main className="min-h-screen bg-gradient-to-br from-jellyfin-darker via-jellyfin-dark to-gray-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-jellyfin-blue/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Temporarily disabled reveal sequence */}
      {/* {stats && hasShownReveal && !revealComplete && isAuthenticated && (
        <RevealSequence stats={stats} useCase="personal" onComplete={handleRevealComplete} />
      )} */}

      <div className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-7xl relative z-10">
        {/* Header - Mobile Optimized */}
        <div className="mb-6 md:mb-12 space-y-4">
          {/* Title Row - Jellyfin Wrapped with Language/Logout */}
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl md:text-4xl lg:text-6xl font-bold text-white bg-gradient-to-r from-white via-jellyfin-blue to-white bg-clip-text text-transparent">
              {t('home.title')}
            </h1>
            <div className="flex flex-col items-end gap-2">
              <LanguageSelector />
              {isAuthenticated && <LoginButton />}
            </div>
          </div>

          {/* Subtitle Row - Statistics with Global/Personal and Year */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-gray-400 text-base md:text-lg lg:text-xl font-light">
              {isAuthenticated && userName && showPersonalized
                ? t('home.personalStats', { name: userName, year })
                : t('home.serverStats', { year })}
            </p>
            <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
              {isAuthenticated && (
                <div className="flex items-center gap-2.5 px-3 py-2 bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-lg">
                  <span className={`text-xs md:text-sm font-semibold transition-colors whitespace-nowrap ${
                    !showPersonalized ? 'text-jellyfin-blue' : 'text-gray-400'
                  }`}>
                    {t('home.global')}
                  </span>
                  <button
                    onClick={() => setShowPersonalized(!showPersonalized)}
                    className={`relative inline-flex h-7 w-12 md:h-8 md:w-14 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-jellyfin-blue focus:ring-offset-2 focus:ring-offset-gray-800 shadow-inner ${
                      showPersonalized 
                        ? 'bg-gradient-to-r from-jellyfin-blue to-blue-500' 
                        : 'bg-gray-600/60'
                    }`}
                    role="switch"
                    aria-checked={showPersonalized}
                  >
                    <span
                      className={`inline-block h-5 w-5 md:h-6 md:w-6 transform rounded-full bg-white shadow-lg transition-all duration-300 ${
                        showPersonalized ? 'translate-x-6 md:translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-xs md:text-sm font-semibold transition-colors whitespace-nowrap ${
                    showPersonalized ? 'text-jellyfin-blue' : 'text-gray-400'
                  }`}>
                    {t('home.personal')}
                  </span>
                </div>
              )}
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="px-4 py-2.5 bg-gray-800/80 backdrop-blur-sm text-white rounded-xl border border-gray-700 hover:border-jellyfin-blue focus:outline-none focus:ring-2 focus:ring-jellyfin-blue transition-smooth cursor-pointer text-sm md:text-base shadow-lg"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {!isAuthenticated && <LoginButton />}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/30 backdrop-blur-sm border border-red-700/50 text-red-200 px-4 md:px-6 py-4 rounded-xl mb-6 shadow-lg shadow-red-900/20 text-sm md:text-base">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span>⚠️</span> {t('home.errorLoading')}
            </h3>
            <p>{error}</p>
          </div>
        )}

        {/* Enhanced Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 md:py-32">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 md:h-20 md:w-20 border-4 border-gray-700 border-t-jellyfin-blue"></div>
            </div>
            <p className="mt-6 text-gray-400 text-base md:text-lg">{t('common.loading')}</p>
          </div>
        )}

        {/* Stats Display */}
        {!loading && stats && (
          <StatsDisplay stats={stats} showPersonalized={showPersonalized} userId={userId} year={year} />
        )}
      </div>
    </main>
  )
}
