'use client'

import PodiumDisplay from './PodiumDisplay'
import MediaList from './MediaList'

interface MediaItem {
  ItemId?: string
  ItemName?: string
  SeriesName?: string
  PosterUrl?: string | null
  PlayCount: number
  TotalPlayDuration: number
}

interface MediaSectionProps {
  title: string
  icon: string
  items: MediaItem[]
  isShow?: boolean
  hoverColor?: 'jellyfin-blue' | 'purple'
}

export default function MediaSection({ title, icon, items, isShow = false, hoverColor = 'jellyfin-blue' }: MediaSectionProps) {
  if (!items || items.length === 0) {
    return null
  }

  const topThree = items.slice(0, 3)
  const remaining = items.slice(3)

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-12 md:mb-8 flex items-center gap-2 md:gap-3 px-2 md:px-0">
        <span className="text-3xl md:text-4xl">{icon}</span>
        {title}
      </h2>
      
      {/* Podium for Top 3 */}
      {items.length >= 3 ? (
        <PodiumDisplay items={topThree} isShow={isShow} />
      ) : (
        /* Fallback: Show all items in compact list if less than 3 */
        <div className="mb-8 md:mb-12">
          <MediaList items={items} startRank={1} isShow={isShow} hoverColor={hoverColor} />
        </div>
      )}

      {/* Compact List for Items 4+ */}
      {remaining.length > 0 && (
        <MediaList items={remaining} startRank={4} isShow={isShow} hoverColor={hoverColor} />
      )}
    </div>
  )
}

