'use client'

import { motion } from 'framer-motion'
import PodiumItem from './PodiumItem'

interface MediaItem {
  ItemId?: string
  ItemName?: string
  SeriesName?: string
  PosterUrl?: string | null
  PlayCount: number
  TotalPlayDuration: number
}

interface PodiumDisplayProps {
  items: MediaItem[]
  isShow?: boolean
}

export default function PodiumDisplay({ items, isShow = false }: PodiumDisplayProps) {
  if (items.length < 3) {
    return null
  }

  // Reorder: 2nd (left), 1st (center), 3rd (right)
  const orderedItems = [items[1], items[0], items[2]]
  const positions: (1 | 2 | 3)[] = [2, 1, 3]

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  }

  return (
    <motion.div 
      className="mb-8 md:mb-12 flex items-end justify-center gap-2 md:gap-4 px-2 md:px-0"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {orderedItems.map((item, index) => {
        const position = positions[index]
        return (
          <PodiumItem
            key={`${item.ItemId || 'item'}-${position}`}
            item={item}
            position={position}
            isShow={isShow}
          />
        )
      })}
    </motion.div>
  )
}

