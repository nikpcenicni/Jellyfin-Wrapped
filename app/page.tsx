'use client'

import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import StatsDisplay from './components/StatsDisplay'
import LoginButton from './components/LoginButton'
// Temporarily disabled reveal sequence
// import RevealSequence from './components/RevealSequence'

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
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [year, setYear] = useState(new Date().getFullYear())
  // Temporarily disabled reveal sequence
  // const [revealComplete, setRevealComplete] = useState(false)
  // const [hasShownReveal, setHasShownReveal] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)

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
          } catch {
            // Invalid user data
            setIsAuthenticated(false)
          }
        }
      }
    }
    checkAuth()
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
  }, [year, isAuthenticated])

  const fetchStats = async (signal: AbortSignal) => {
    try {
      setLoading(true)
      // Temporarily disabled reveal sequence
      // setRevealComplete(false)
      // setHasShownReveal(false)
      setError(null)

      // Check if user is authenticated
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('jellyfin_access_token') : null
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('jellyfin_user') : null
      const isUserAuthenticated = !!(accessToken && userStr)

      let response
      if (accessToken && userStr) {
        try {
          const user = JSON.parse(userStr)
          // Fetch personalized stats
          response = await axios.get(`/api/stats/personal?year=${year}&userId=${user.id}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            },
            signal
          })
        } catch (authErr: any) {
          // Ignore request cancellation errors
          if (axios.isCancel(authErr) || authErr.code === 'ECONNABORTED' || authErr.code === 'ERR_CANCELED' || authErr.name === 'AbortError' || authErr.name === 'CanceledError') {
            return // Request was cancelled, don't proceed
          }
          // If personalized stats fail for other reasons, fall back to server-wide stats
          console.warn('Failed to fetch personalized stats, falling back to server-wide:', authErr)
          response = await axios.get(`/api/stats?year=${year}`, { signal })
        }
      } else {
        // Fetch server-wide stats
        response = await axios.get(`/api/stats?year=${year}`, { signal })
      }

      // Check if request was aborted
      if (signal.aborted) {
        return
      }

      setStats(response.data)
      setLoading(false)
      
      // Temporarily disabled reveal sequence - stats show immediately for all users
      // if (response.data && isUserAuthenticated) {
      //   setHasShownReveal(true)
      // } else if (response.data) {
      //   setRevealComplete(true)
      // }
    } catch (err: any) {
      // Ignore request cancellation errors
      if (axios.isCancel(err) || err.code === 'ECONNABORTED' || err.code === 'ERR_CANCELED' || err.name === 'AbortError' || err.name === 'CanceledError') {
        return // Request was cancelled, don't update state
      }
      
      setError(err.response?.data?.message || 'Failed to load statistics')
      console.error('Error fetching stats:', err)
      setLoading(false)
      // Temporarily disabled reveal sequence
      // setRevealComplete(true)
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-12 gap-4">
          <div className="w-full md:w-auto">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-2 md:mb-3 bg-gradient-to-r from-white via-jellyfin-blue to-white bg-clip-text text-transparent">
              Jellyfin Wrapped
            </h1>
            <p className="text-gray-400 text-base md:text-xl font-light">
              {isAuthenticated && userName 
                ? `${userName}'s Statistics for ${year}`
                : `Server Statistics for ${year}`}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="px-4 py-2.5 bg-gray-800/80 backdrop-blur-sm text-white rounded-xl border border-gray-700 hover:border-jellyfin-blue focus:outline-none focus:ring-2 focus:ring-jellyfin-blue transition-smooth cursor-pointer text-sm md:text-base"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <LoginButton />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-900/30 backdrop-blur-sm border border-red-700/50 text-red-200 px-4 md:px-6 py-4 rounded-xl mb-6 shadow-lg shadow-red-900/20 text-sm md:text-base">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span>⚠️</span> Error Loading Statistics
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
            <p className="mt-6 text-gray-400 text-base md:text-lg">Loading your year in review...</p>
          </div>
        )}

        {/* Stats Display */}
        {!loading && stats && (
          <StatsDisplay stats={stats} />
        )}
      </div>
    </main>
  )
}
