'use client'

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

interface PodiumItemProps {
  item: MediaItem
  position: 1 | 2 | 3
  isShow?: boolean
}

const PODIUM_CONFIG = {
  1: {
    color: '#FFD700', // Gold
    translateY: 'translate-y-[-40px] md:translate-y-[-50px]',
    maxWidth: 'max-w-[220px] md:max-w-[280px]',
    badgeSize: 'w-12 h-12 md:w-14 md:h-14',
    badgeText: 'text-xl md:text-2xl',
    titleSize: 'text-base md:text-lg'
  },
  2: {
    color: '#C0C0C0', // Silver
    translateY: 'translate-y-[-20px] md:translate-y-[-30px]',
    maxWidth: 'max-w-[200px] md:max-w-[250px]',
    badgeSize: 'w-10 h-10 md:w-12 md:h-12',
    badgeText: 'text-lg md:text-xl',
    titleSize: 'text-sm md:text-base'
  },
  3: {
    color: '#CD7F32', // Bronze
    translateY: 'translate-y-[-10px] md:translate-y-[-15px]',
    maxWidth: 'max-w-[200px] md:max-w-[250px]',
    badgeSize: 'w-10 h-10 md:w-12 md:h-12',
    badgeText: 'text-lg md:text-xl',
    titleSize: 'text-sm md:text-base'
  }
}

export default function PodiumItem({ item, position, isShow = false }: PodiumItemProps) {
  const config = PODIUM_CONFIG[position]
  const title = item.ItemName || item.SeriesName || 'Unknown'
  const playLabel = isShow ? 'episodes' : 'plays'
  const playIcon = isShow ? '📼' : '▶️'

  return (
    <div className={`flex flex-col items-center flex-1 ${config.maxWidth}`}>
      <div className={`relative w-full aspect-[2/3] rounded-xl md:rounded-2xl overflow-hidden shadow-2xl mb-2 transform ${config.translateY}`}>
        <PosterImage
          src={item.PosterUrl}
          alt={title}
          className="w-full h-full object-cover"
          fallbackClassName="w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/40" />
        <div
          className={`absolute top-2 left-2 backdrop-blur-sm text-white ${config.badgeText} font-bold ${config.badgeSize} rounded-full flex items-center justify-center shadow-lg border-2 border-white/20`}
          style={{ backgroundColor: config.color }}
        >
          {position}
        </div>
      </div>
      <div className="text-center">
        <h3 className={`${config.titleSize} font-bold text-white mb-1 line-clamp-2`}>
          {title}
        </h3>
        <div className="text-xs md:text-sm text-gray-300">
          <div>{playIcon} {item.PlayCount} {playLabel}</div>
          <div>⏱️ {formatDuration(item.TotalPlayDuration || 0)}</div>
        </div>
      </div>
    </div>
  )
}

