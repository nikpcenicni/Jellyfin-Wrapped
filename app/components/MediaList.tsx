'use client'

import { motion } from 'framer-motion'
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0
  }
}

export default function MediaList({ items, startRank = 1, isShow = false, hoverColor = 'jellyfin-blue' }: MediaListProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <motion.div 
      className="space-y-2 md:space-y-3"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {items.map((item, index) => (
        <motion.div 
          key={item.ItemId || index} 
          variants={itemVariants}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <MediaListItem
            item={item}
            rank={startRank + index}
            isShow={isShow}
            hoverColor={hoverColor}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}

