'use client'

import { useEffect, useState } from 'react'
import TotalWatchTimeCard from './TotalWatchTimeCard'
import MediaSection from './MediaSection'
import UserRanking from './UserRanking'
import { formatDuration } from './utils'

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

interface StatsDisplayProps {
  stats: Stats
  showPersonalized?: boolean
  userId?: string | null
  year?: number
}

export default function StatsDisplay({ stats, showPersonalized = false, userId = null, year }: StatsDisplayProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger fade-in after component mounts
    setTimeout(() => {
      setIsVisible(true)
    }, 100)
  }, [])

  const totalWatchTime = stats.totalWatchTime?.[0] || {}

  return (
    <div className={`space-y-6 md:space-y-10 transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* User Ranking - Only show when personalized */}
      {showPersonalized && userId && year && (
        <UserRanking year={year} userId={userId} />
      )}

      {/* Total Watch Time Card */}
      {totalWatchTime && (
        <TotalWatchTimeCard totalWatchTime={totalWatchTime} />
      )}

      {/* Top Movies */}
      <MediaSection
        title="Top Movies"
        icon="🎥"
        items={stats.topMovies || []}
        isShow={false}
        hoverColor="jellyfin-blue"
      />

      {/* Top TV Shows */}
      <MediaSection
        title="Top TV Shows"
        icon="📺"
        items={stats.topShows || []}
        isShow={true}
        hoverColor="purple"
      />

      {/* Movies vs Shows Comparison */}
      {stats.preferredMediaType && (
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-gray-700/50 shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-8 flex items-center gap-2 md:gap-3">
            <span className="text-3xl md:text-4xl">⚖️</span>
            Movies vs TV Shows
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <div className={`bg-gradient-to-br ${stats.preferredMediaType.type === 'Movies' ? 'from-jellyfin-blue/30 to-jellyfin-blue/10' : 'from-gray-900/60 to-gray-900/40'} rounded-lg md:rounded-xl p-6 md:p-8 border-2 ${stats.preferredMediaType.type === 'Movies' ? 'border-jellyfin-blue/50' : 'border-gray-700/30'} backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <span>🎥</span> Movies
                </h3>
                {stats.preferredMediaType.type === 'Movies' && (
                  <span className="text-sm md:text-base font-semibold text-jellyfin-blue bg-jellyfin-blue/20 px-3 py-1 rounded-full">Winner</span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Total Hours</div>
                  <div className="text-2xl md:text-3xl font-bold text-white">{stats.preferredMediaType.movies.hours?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">Total Plays</div>
                  <div className="text-xl md:text-2xl font-bold text-white">{stats.preferredMediaType.movies.plays?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">Unique Items</div>
                  <div className="text-xl md:text-2xl font-bold text-white">{stats.preferredMediaType.movies.uniqueItems?.toLocaleString() || 0}</div>
                </div>
              </div>
            </div>
            <div className={`bg-gradient-to-br ${stats.preferredMediaType.type === 'Shows' ? 'from-purple-600/30 to-purple-600/10' : 'from-gray-900/60 to-gray-900/40'} rounded-lg md:rounded-xl p-6 md:p-8 border-2 ${stats.preferredMediaType.type === 'Shows' ? 'border-purple-500/50' : 'border-gray-700/30'} backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <span>📺</span> TV Shows
                </h3>
                {stats.preferredMediaType.type === 'Shows' && (
                  <span className="text-sm md:text-base font-semibold text-purple-400 bg-purple-500/20 px-3 py-1 rounded-full">Winner</span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-gray-400 text-sm mb-1">Total Hours</div>
                  <div className="text-2xl md:text-3xl font-bold text-white">{stats.preferredMediaType.shows.hours?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">Total Plays</div>
                  <div className="text-xl md:text-2xl font-bold text-white">{stats.preferredMediaType.shows.plays?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">Unique Items</div>
                  <div className="text-xl md:text-2xl font-bold text-white">{stats.preferredMediaType.shows.uniqueItems?.toLocaleString() || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top Genres */}
      {stats.topGenres && stats.topGenres.length > 0 && (
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-gray-700/50 shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-8 flex items-center gap-2 md:gap-3">
            <span className="text-3xl md:text-4xl">🎭</span>
            Top Genres
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {stats.topGenres.map((genre, index) => (
              <div
                key={genre.genre || index}
                className="bg-gradient-to-br from-gray-900/60 to-gray-900/40 rounded-lg md:rounded-xl p-4 md:p-6 hover:from-gray-900/80 hover:to-gray-900/60 hover:scale-105 hover:shadow-lg border border-gray-700/30 hover:border-jellyfin-blue/50 backdrop-blur-sm"
              >
                <div className="text-gray-400 text-xs md:text-sm mb-2 font-medium">
                  #{index + 1}
                </div>
                <div className="text-lg md:text-xl font-bold text-white mb-2 truncate" title={genre.genre}>
                  {genre.genre}
                </div>
                <div className="text-gray-300 text-sm md:text-base">
                  {genre.count?.toLocaleString() || 0} <span className="text-xs text-gray-500">plays</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Movie Years */}
      {stats.topMovieYears && stats.topMovieYears.length > 0 && (
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-gray-700/50 shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-8 flex items-center gap-2 md:gap-3">
            <span className="text-3xl md:text-4xl">📆</span>
            Most Popular Movie Years
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {stats.topMovieYears.map((yearData, index) => (
              <div
                key={yearData.year || index}
                className="bg-gradient-to-br from-gray-900/60 to-gray-900/40 rounded-lg md:rounded-xl p-4 md:p-6 hover:from-gray-900/80 hover:to-gray-900/60 hover:scale-105 hover:shadow-lg border border-gray-700/30 hover:border-jellyfin-blue/50 backdrop-blur-sm"
              >
                <div className="text-gray-400 text-xs md:text-sm mb-2 font-medium">
                  #{index + 1}
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {yearData.year}
                </div>
                <div className="text-gray-300 text-sm md:text-base">
                  {yearData.count?.toLocaleString() || 0} <span className="text-xs text-gray-500">plays</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Activity */}
      {stats.monthlyActivity && stats.monthlyActivity.length > 0 && (
        <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-gray-700/50 shadow-xl">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-8 flex items-center gap-2 md:gap-3">
            <span className="text-3xl md:text-4xl">📅</span>
            Monthly Activity
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
            {stats.monthlyActivity.map((month, index) => (
              <div
                key={month.Month || index}
                className="bg-gradient-to-br from-gray-900/60 to-gray-900/40 rounded-lg md:rounded-xl p-4 md:p-6 hover:from-gray-900/80 hover:to-gray-900/60 hover:scale-105 hover:shadow-lg border border-gray-700/30 hover:border-jellyfin-blue/50 backdrop-blur-sm"
              >
                <div className="text-gray-400 text-xs md:text-sm mb-2 md:mb-3 font-medium">
                  {new Date(month.Month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
                <div className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">
                  {month.PlayCount?.toLocaleString()} <span className="text-sm md:text-lg font-normal text-gray-400">plays</span>
                </div>
                <div className="text-gray-300 text-xs md:text-sm flex items-center gap-1">
                  <span>⏱️</span> {formatDuration(month.TotalSeconds || 0)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
