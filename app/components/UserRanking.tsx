'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import axios from 'axios'
import { formatHours } from './utils'

interface RankingData {
  year: number
  allMedia: {
    rank: number | null
    totalUsers: number
    stats: {
      totalSeconds: number
      totalHours: number
    } | null
  }
  movies: {
    rank: number | null
    totalUsers: number
    stats: {
      totalSeconds: number
      totalHours: number
    } | null
  }
  shows: {
    rank: number | null
    totalUsers: number
    stats: {
      totalSeconds: number
      totalHours: number
    } | null
  }
}

interface UserRankingProps {
  year: number
  userId: string
  rankingData?: RankingData | null
}

export default function UserRanking({ year, userId, rankingData: propRankingData }: UserRankingProps) {
  const t = useTranslations()
  const [rankingData, setRankingData] = useState<RankingData | null>(propRankingData || null)
  const [loading, setLoading] = useState(!propRankingData)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // If ranking data is provided as prop, use it
    if (propRankingData) {
      setRankingData(propRankingData)
      setLoading(false)
      return
    }

    // Otherwise, fetch it (fallback for backwards compatibility)
    const fetchRanking = async () => {
      try {
        setLoading(true)
        setError(null)

        const accessToken = typeof window !== 'undefined' ? localStorage.getItem('jellyfin_access_token') : null
        if (!accessToken) {
          setError('Not authenticated')
          setLoading(false)
          return
        }

        const response = await axios.get(`/api/stats/ranking?year=${year}&userId=${userId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })

        setRankingData(response.data)
        setLoading(false)
      } catch (err: any) {
        console.error('Error fetching ranking:', err)
        setError(err.response?.data?.message || 'Failed to load rankings')
        setLoading(false)
      }
    }

    if (userId) {
      fetchRanking()
    }
  }, [year, userId, propRankingData])

  if (loading) {
    return (
      <motion.div 
        className="bg-gray-800/60 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-gray-700/50 shadow-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-center py-8">
          <motion.div 
            className="rounded-full h-8 w-8 border-4 border-gray-700 border-t-jellyfin-blue"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </motion.div>
    )
  }

  if (error || !rankingData) {
    return null // Don't show error, just don't display the component
  }

  const getRankDisplay = (rank: number | null, totalUsers: number) => {
    if (rank === null) return 'N/A'
    return `#${rank} of ${totalUsers}`
  }

  const getRankBadgeColor = (rank: number | null, totalUsers: number) => {
    if (rank === null) return 'bg-gray-600'
    const percentage = (rank / totalUsers) * 100
    if (percentage <= 10) return 'bg-green-600'
    if (percentage <= 25) return 'bg-blue-600'
    if (percentage <= 50) return 'bg-yellow-600'
    return 'bg-gray-600'
  }

  const rankings = [
    {
      title: t('stats.allMedia'),
      icon: '🎬',
      data: rankingData.allMedia,
      color: 'jellyfin-blue'
    },
    {
      title: t('stats.movies'),
      icon: '🎥',
      data: rankingData.movies,
      color: 'blue'
    },
    {
      title: t('stats.tvShows'),
      icon: '📺',
      data: rankingData.shows,
      color: 'purple'
    }
  ]

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1
    }
  }

  return (
    <motion.div 
      className="bg-gray-800/60 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-gray-700/50 shadow-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h2 
        className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-8 flex items-center gap-2 md:gap-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <span className="text-3xl md:text-4xl">🏆</span>
        {t('stats.yourRanking')}
      </motion.h2>
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {rankings.map((ranking) => (
          <motion.div
            key={ranking.title}
            className="bg-gradient-to-br from-gray-900/60 to-gray-900/40 rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-700/30 hover:border-jellyfin-blue/50 backdrop-blur-sm"
            variants={itemVariants}
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span>{ranking.icon}</span>
                {ranking.title}
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-gray-400 text-xs md:text-sm mb-1">{t('stats.rank')}</div>
                <div className={`inline-block px-3 py-1 rounded-full text-sm md:text-base font-semibold text-white ${getRankBadgeColor(ranking.data.rank, ranking.data.totalUsers)}`}>
                  {getRankDisplay(ranking.data.rank, ranking.data.totalUsers)}
                </div>
              </div>
              {ranking.data.stats && (
                <div>
                  <div className="text-gray-400 text-xs md:text-sm mb-1">{t('stats.yourWatchTime')}</div>
                  <div className="text-lg md:text-xl font-bold text-white">
                    {formatHours(ranking.data.stats.totalHours)}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}

