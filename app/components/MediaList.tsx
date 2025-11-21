'use client'

import MediaListItem from './MediaListItem'

interface MediaItem {
  ItemId?: string
  ItemName?: string
  SeriesName?: string
  PosterUrl?: string | null
  PlayCount: number
  TotalPlayDuration: number
}

interface MediaListProps {
  items: MediaItem[]
  startRank?: number
  isShow?: boolean
  hoverColor?: 'jellyfin-blue' | 'purple'
}

export default function MediaList({ items, startRank = 1, isShow = false, hoverColor = 'jellyfin-blue' }: MediaListProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 md:space-y-3">
      {items.map((item, index) => (
        <MediaListItem
          key={item.ItemId || index}
          item={item}
          rank={startRank + index}
          isShow={isShow}
          hoverColor={hoverColor}
        />
      ))}
    </div>
  )
}

