'use client'

import { useEffect, useState } from 'react'
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
}

export default function UserRanking({ year, userId }: UserRankingProps) {
  const [rankingData, setRankingData] = useState<RankingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
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
  }, [year, userId])

  if (loading) {
    return (
      <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-gray-700/50 shadow-xl">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-700 border-t-jellyfin-blue"></div>
        </div>
      </div>
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
      title: 'All Media',
      icon: '🎬',
      data: rankingData.allMedia,
      color: 'jellyfin-blue'
    },
    {
      title: 'Movies',
      icon: '🎥',
      data: rankingData.movies,
      color: 'blue'
    },
    {
      title: 'TV Shows',
      icon: '📺',
      data: rankingData.shows,
      color: 'purple'
    }
  ]

  return (
    <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl md:rounded-2xl p-4 md:p-8 border border-gray-700/50 shadow-xl">
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 md:mb-8 flex items-center gap-2 md:gap-3">
        <span className="text-3xl md:text-4xl">🏆</span>
        Your Ranking
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {rankings.map((ranking) => (
          <div
            key={ranking.title}
            className="bg-gradient-to-br from-gray-900/60 to-gray-900/40 rounded-lg md:rounded-xl p-4 md:p-6 border border-gray-700/30 hover:border-jellyfin-blue/50 backdrop-blur-sm hover:scale-105 transition-transform"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span>{ranking.icon}</span>
                {ranking.title}
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <div className="text-gray-400 text-xs md:text-sm mb-1">Rank</div>
                <div className={`inline-block px-3 py-1 rounded-full text-sm md:text-base font-semibold text-white ${getRankBadgeColor(ranking.data.rank, ranking.data.totalUsers)}`}>
                  {getRankDisplay(ranking.data.rank, ranking.data.totalUsers)}
                </div>
              </div>
              {ranking.data.stats && (
                <div>
                  <div className="text-gray-400 text-xs md:text-sm mb-1">Your Watch Time</div>
                  <div className="text-lg md:text-xl font-bold text-white">
                    {formatHours(ranking.data.stats.totalHours)}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

