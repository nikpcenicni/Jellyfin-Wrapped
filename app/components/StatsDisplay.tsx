'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
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
  previousYearTotalWatchTime?: any[]
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

interface StatsDisplayProps {
  stats: Stats
  showPersonalized?: boolean
  userId?: string | null
  year?: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0
  }
}

export default function StatsDisplay({ stats, showPersonalized = false, userId = null, year }: StatsDisplayProps) {
  const t = useTranslations()
  const totalWatchTime = stats.totalWatchTime?.[0] || {}

  return (
    <motion.div 
      className="space-y-6 md:space-y-10"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ============================================ */}
      {/* SECTION 1: OVERVIEW & SUMMARY STATISTICS */}
      {/* ============================================ */}
      
      {/* Total Watch Time Card - Overall summary first */}
      {totalWatchTime && (
        <motion.div 
          variants={itemVariants}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <TotalWatchTimeCard 
            totalWatchTime={totalWatchTime} 
            previousYearTotalWatchTime={stats.previousYearTotalWatchTime}
          />
        </motion.div>
      )}

      {/* User Ranking - Only show when personalized, after total watch time */}
      {showPersonalized && userId && year && (
        <motion.div 
          variants={itemVariants}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <UserRanking year={year} userId={userId} rankingData={stats.userRanking} />
        </motion.div>
      )}

      {/* ============================================ */}
      {/* SECTION 2: TOP CONTENT */}
      {/* ============================================ */}
      
      {/* Top Movies */}
      <motion.div 
        variants={itemVariants}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <MediaSection
          title={t('stats.topMovies')}
          icon="🎥"
          items={stats.topMovies || []}
          isShow={false}
          hoverColor="jellyfin-blue"
        />
      </motion.div>

      {/* Top TV Shows */}
      <motion.div 
        variants={itemVariants}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <MediaSection
          title={t('stats.topShows')}
          icon="📺"
          items={stats.topShows || []}
          isShow={true}
          hoverColor="purple"
        />
      </motion.div>

      {/* ============================================ */}
      {/* SECTION 3: COMPARISONS & PREFERENCES */}
      {/* ============================================ */}
      
      {/* Movies vs Shows Comparison */}
      {stats.preferredMediaType && (
        <motion.div 
          className="bg-gray-800/60 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-gray-700/50 shadow-xl"
          variants={itemVariants}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-8 flex items-center gap-2 md:gap-3">
            <span className="text-3xl md:text-4xl">⚖️</span>
            {t('stats.moviesVsShows')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
            <div className={`bg-gradient-to-br ${stats.preferredMediaType.type === 'Movies' ? 'from-jellyfin-blue/30 to-jellyfin-blue/10' : 'from-gray-900/60 to-gray-900/40'} rounded-lg md:rounded-xl p-6 md:p-8 border-2 ${stats.preferredMediaType.type === 'Movies' ? 'border-jellyfin-blue/50' : 'border-gray-700/30'} backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <span>🎥</span> {t('stats.movies')}
                </h3>
                {stats.preferredMediaType.type === 'Movies' && (
                  <span className="text-sm md:text-base font-semibold text-jellyfin-blue bg-jellyfin-blue/20 px-3 py-1 rounded-full">{t('stats.winner')}</span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-gray-400 text-sm mb-1">{t('stats.totalHours')}</div>
                  <div className="text-2xl md:text-3xl font-bold text-white">{stats.preferredMediaType.movies.hours?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">{t('stats.totalPlays')}</div>
                  <div className="text-xl md:text-2xl font-bold text-white">{stats.preferredMediaType.movies.plays?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">{t('stats.uniqueItems')}</div>
                  <div className="text-xl md:text-2xl font-bold text-white">{stats.preferredMediaType.movies.uniqueItems?.toLocaleString() || 0}</div>
                </div>
              </div>
            </div>
            <div className={`bg-gradient-to-br ${stats.preferredMediaType.type === 'Shows' ? 'from-purple-600/30 to-purple-600/10' : 'from-gray-900/60 to-gray-900/40'} rounded-lg md:rounded-xl p-6 md:p-8 border-2 ${stats.preferredMediaType.type === 'Shows' ? 'border-purple-500/50' : 'border-gray-700/30'} backdrop-blur-sm`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                  <span>📺</span> {t('stats.tvShows')}
                </h3>
                {stats.preferredMediaType.type === 'Shows' && (
                  <span className="text-sm md:text-base font-semibold text-purple-400 bg-purple-500/20 px-3 py-1 rounded-full">{t('stats.winner')}</span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-gray-400 text-sm mb-1">{t('stats.totalHours')}</div>
                  <div className="text-2xl md:text-3xl font-bold text-white">{stats.preferredMediaType.shows.hours?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">{t('stats.totalPlays')}</div>
                  <div className="text-xl md:text-2xl font-bold text-white">{stats.preferredMediaType.shows.plays?.toLocaleString() || 0}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-sm mb-1">{t('stats.uniqueItems')}</div>
                  <div className="text-xl md:text-2xl font-bold text-white">{stats.preferredMediaType.shows.uniqueItems?.toLocaleString() || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Top Genres */}
      {stats.topGenres && stats.topGenres.length > 0 && (
        <motion.div 
          className="bg-gray-800/60 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-gray-700/50 shadow-xl"
          variants={itemVariants}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-8 flex items-center gap-2 md:gap-3">
            <span className="text-3xl md:text-4xl">🎭</span>
            {t('stats.topGenres')}
          </h2>
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {stats.topGenres.map((genre, index) => (
              <motion.div
                key={genre.genre || index}
                className="bg-gradient-to-br from-gray-900/60 to-gray-900/40 rounded-lg md:rounded-xl p-4 md:p-6 hover:from-gray-900/80 hover:to-gray-900/60 hover:scale-105 hover:shadow-lg border border-gray-700/30 hover:border-jellyfin-blue/50 backdrop-blur-sm"
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="text-gray-400 text-xs md:text-sm mb-2 font-medium">
                  #{index + 1}
                </div>
                <div className="text-lg md:text-xl font-bold text-white mb-2 truncate" title={genre.genre}>
                  {genre.genre}
                </div>
                <div className="text-gray-300 text-sm md:text-base">
                  {genre.count?.toLocaleString() || 0} <span className="text-xs text-gray-500">{t('common.plays')}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Top Movie Years */}
      {stats.topMovieYears && stats.topMovieYears.length > 0 && (
        <motion.div 
          className="bg-gray-800/60 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-gray-700/50 shadow-xl"
          variants={itemVariants}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-8 flex items-center gap-2 md:gap-3">
            <span className="text-3xl md:text-4xl">📆</span>
            {t('stats.mostPopularMovieYears')}
          </h2>
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {stats.topMovieYears.map((yearData, index) => (
              <motion.div
                key={yearData.year || index}
                className="bg-gradient-to-br from-gray-900/60 to-gray-900/40 rounded-lg md:rounded-xl p-4 md:p-6 hover:from-gray-900/80 hover:to-gray-900/60 hover:scale-105 hover:shadow-lg border border-gray-700/30 hover:border-jellyfin-blue/50 backdrop-blur-sm"
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="text-gray-400 text-xs md:text-sm mb-2 font-medium">
                  #{index + 1}
                </div>
                <div className="text-2xl md:text-3xl font-bold text-white mb-2">
                  {yearData.year}
                </div>
                <div className="text-gray-300 text-sm md:text-base">
                  {yearData.count?.toLocaleString() || 0} <span className="text-xs text-gray-500">{t('common.plays')}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* ============================================ */}
      {/* SECTION 4: TEMPORAL/ACTIVITY DATA */}
      {/* ============================================ */}
      
      {/* Monthly Activity */}
      {stats.monthlyActivity && stats.monthlyActivity.length > 0 && (
        <motion.div 
          className="bg-gray-800/60 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-gray-700/50 shadow-xl"
          variants={itemVariants}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-8 flex items-center gap-2 md:gap-3">
            <span className="text-3xl md:text-4xl">📅</span>
            {t('stats.monthlyActivity')}
          </h2>
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {stats.monthlyActivity.map((month, index) => (
              <motion.div
                key={month.Month || index}
                className="bg-gradient-to-br from-gray-900/60 to-gray-900/40 rounded-lg md:rounded-xl p-4 md:p-6 hover:from-gray-900/80 hover:to-gray-900/60 hover:scale-105 hover:shadow-lg border border-gray-700/30 hover:border-jellyfin-blue/50 backdrop-blur-sm"
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="text-gray-400 text-xs md:text-sm mb-2 md:mb-3 font-medium">
                  {new Date(month.Month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </div>
                <div className="text-xl md:text-2xl font-bold text-white mb-1 md:mb-2">
                  {month.PlayCount?.toLocaleString()} <span className="text-sm md:text-lg font-normal text-gray-400">{t('common.plays')}</span>
                </div>
                <div className="text-gray-300 text-xs md:text-sm flex items-center gap-1">
                  <span>⏱️</span> {formatDuration(month.TotalSeconds || 0)}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}
