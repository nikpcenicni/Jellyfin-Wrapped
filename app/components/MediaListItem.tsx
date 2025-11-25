'use client'

import { motion } from 'framer-motion'
import PosterImage from './PosterImage'
import { formatDuration } from './utils'

interface MediaItem {
  ItemId?: string
  ItemName?: string
  SeriesName?: string
  PosterUrl?: string | null
  PlayCount: number
  TotalPlayDuration: number
}

interface MediaListItemProps {
  item: MediaItem
  rank: number
  isShow?: boolean
  hoverColor?: 'jellyfin-blue' | 'purple'
}

const HOVER_COLORS = {
  'jellyfin-blue': 'hover:border-jellyfin-blue/50',
  'purple': 'hover:border-purple-600/50',
}

export default function MediaListItem({ item, rank, isShow = false, hoverColor = 'jellyfin-blue' }: MediaListItemProps) {
  const title = item.ItemName || item.SeriesName || 'Unknown'
  const playLabel = isShow ? 'episodes' : 'plays'
  const playIcon = isShow ? '📼' : '▶️'
  const hoverClass = HOVER_COLORS[hoverColor as keyof typeof HOVER_COLORS] || HOVER_COLORS['jellyfin-blue']

  return (
    <motion.div 
      className={`flex items-center gap-3 md:gap-4 bg-gray-800/40 backdrop-blur-sm rounded-lg md:rounded-xl p-3 md:p-4 border border-gray-700/30 ${hoverClass} hover:bg-gray-800/60 transition-all`}
      whileHover={{ scale: 1.02, x: 5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      {/* Ranking Number */}
      <div className="flex-shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-700/50 flex items-center justify-center text-white font-bold text-sm md:text-base">
        {rank}
      </div>
      
      {/* Small Poster */}
      <div className="flex-shrink-0 w-12 h-18 md:w-16 md:h-24 rounded overflow-hidden">
        <PosterImage
          src={item.PosterUrl}
          alt={title}
          className="w-full h-full object-cover"
          fallbackClassName="w-full h-full"
        />
      </div>
      
      {/* Title and Stats */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm md:text-base font-bold text-white mb-1 truncate">
          {title}
        </h3>
        <div className="flex flex-wrap gap-2 md:gap-3 text-xs md:text-sm text-gray-300">
          <span>{playIcon} {item.PlayCount} {playLabel}</span>
          <span>⏱️ {formatDuration(item.TotalPlayDuration || 0)}</span>
        </div>
      </div>
    </motion.div>
  )
}

