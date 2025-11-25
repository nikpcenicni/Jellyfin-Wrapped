'use client'

import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import StatsDisplay from './components/StatsDisplay'
import LoginButton from './components/LoginButton'
import LanguageSelector from './components/LanguageSelector'
import WrappedExperience from './components/WrappedExperience'
import ComingSoon from './components/ComingSoon'
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
  userRanking?: any
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
  const [showWrapped, setShowWrapped] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [unlockDate, setUnlockDate] = useState<string | null>(null)

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

    // Reset lock state when year changes
    setIsLocked(false)
    setUnlockDate(null)

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
        topMovieYears: null,
        userRanking: undefined
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

      // Fetch ranking data in parallel if user is authenticated (don't wait for other stats)
      let rankingPromise: Promise<any> | null = null
      if (isUserAuthenticated && userId) {
        rankingPromise = axios.get(`/api/stats/ranking?year=${year}&userId=${userId}`, {
          headers: authHeaders,
          signal
        }).then(response => response.data).catch(err => {
          // Ignore lock errors and cancellation errors
          if (err.response?.status === 403 || axios.isCancel(err) || err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED' || err.name === 'AbortError' || err.name === 'CanceledError') {
            return null
          }
          console.warn('Failed to fetch ranking:', err)
          return null
        })
      }

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
          
          // Check if this is a lock error (403)
          if (endpointErr.response?.status === 403 && endpointErr.response?.data?.error === 'Wrapped for the current year is locked') {
            setIsLocked(true)
            setUnlockDate(endpointErr.response.data.unlockDate)
            setLoading(false)
            return
          }
          
          console.warn(`Failed to fetch ${endpoint.key}:`, endpointErr)
          // Continue with next endpoint
        }
      }

      if (signal.aborted) return

      // Wait for ranking data if it was requested
      if (rankingPromise) {
        try {
          const rankingData = await rankingPromise
          if (!signal.aborted && rankingData) {
            setStats(prev => {
              if (!prev) return prev
              return { ...prev, userRanking: rankingData }
            })
          }
        } catch (err) {
          // Already handled in the promise catch
        }
      }

      if (signal.aborted) return

      setLoading(false)
    } catch (err: any) {
      // Ignore request cancellation errors
      if (axios.isCancel(err) || err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED' || err.name === 'AbortError' || err.name === 'CanceledError') {
        return // Request was cancelled, don't update state
      }
      
      // Check if this is a lock error (403)
      if (err.response?.status === 403 && err.response?.data?.error === 'Wrapped for the current year is locked') {
        setIsLocked(true)
        setUnlockDate(err.response.data.unlockDate)
        setLoading(false)
        return
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

      {/* Wrapped Experience */}
      {showWrapped && stats && (
        <WrappedExperience
          stats={stats}
          userName={userName}
          userId={userId}
          onComplete={() => setShowWrapped(false)}
        />
      )}

      <motion.div 
        className="container mx-auto px-3 md:px-4 py-4 md:py-8 max-w-7xl relative z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header - Mobile Optimized */}
        <motion.div 
          className="mb-6 md:mb-12 space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Title Row - Jellyfin Wrapped with Language/Logout */}
          <motion.div 
            className="flex items-center justify-between gap-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <motion.h1 
              className="text-3xl md:text-4xl lg:text-6xl font-bold text-white bg-gradient-to-r from-white via-jellyfin-blue to-white bg-clip-text text-transparent"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {t('home.title')}
            </motion.h1>
            <motion.div 
              className="flex flex-col items-end gap-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <LanguageSelector />
              {isAuthenticated && <LoginButton />}
            </motion.div>
          </motion.div>

          {/* Subtitle Row - Statistics with Global/Personal and Year */}
          <motion.div 
            className="flex items-center justify-between gap-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <motion.p 
              className="text-gray-400 text-base md:text-lg lg:text-xl font-light"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {isAuthenticated && userName && showPersonalized
                ? t('home.personalStats', { name: userName, year })
                : t('home.serverStats', { year })}
            </motion.p>
            <motion.div 
              className="flex items-center gap-3 md:gap-6 flex-shrink-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
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
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div 
            className="bg-red-900/30 backdrop-blur-sm border border-red-700/50 text-red-200 px-4 md:px-6 py-4 rounded-xl mb-6 shadow-lg shadow-red-900/20 text-sm md:text-base"
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
          >
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span>⚠️</span> {t('home.errorLoading')}
            </h3>
            <p>{error}</p>
          </motion.div>
        )}

        {/* Enhanced Loading State */}
        {loading && (
          <motion.div 
            className="flex flex-col items-center justify-center py-20 md:py-32"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              className="relative"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <div className="rounded-full h-16 w-16 md:h-20 md:w-20 border-4 border-gray-700 border-t-jellyfin-blue"></div>
            </motion.div>
            <motion.p 
              className="mt-6 text-gray-400 text-base md:text-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {t('common.loading')}
            </motion.p>
          </motion.div>
        )}

        {/* Coming Soon / Locked State */}
        {!loading && isLocked && unlockDate && (
          <ComingSoon unlockDate={unlockDate} year={year} />
        )}

        {/* Wrapped Button */}
        {!loading && stats && !isLocked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-6 flex justify-center"
          >
            <button
              onClick={() => setShowWrapped(true)}
              className="px-8 py-4 bg-gradient-to-r from-jellyfin-blue to-purple-600 text-white font-bold text-lg rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-3"
            >
              <span>🎬</span>
              <span>{t('wrapped.startExperience')}</span>
            </button>
          </motion.div>
        )}

        {/* Stats Display */}
        {!loading && stats && !isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <StatsDisplay stats={stats} showPersonalized={showPersonalized} userId={userId} year={year} />
          </motion.div>
        )}
      </motion.div>
    </main>
  )
}
