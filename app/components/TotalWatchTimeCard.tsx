'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { formatHours } from './utils'

interface TotalWatchTime {
  TotalHours?: number
  TotalPlays?: number
  UniqueItems?: number
}

interface TotalWatchTimeCardProps {
  totalWatchTime: TotalWatchTime
}

export default function TotalWatchTimeCard({ totalWatchTime }: TotalWatchTimeCardProps) {
  const t = useTranslations()
  const stats = [
    { label: t('stats.totalHours'), value: formatHours(totalWatchTime.TotalHours || 0), icon: '⏱️' },
    { label: t('stats.totalPlays'), value: totalWatchTime.TotalPlays?.toLocaleString() || 0, icon: '▶️' },
    { label: t('stats.uniqueItems'), value: totalWatchTime.UniqueItems?.toLocaleString() || 0, icon: '📚' },
  ]

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
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

  return (
    <motion.div 
      className="bg-gradient-to-br from-jellyfin-blue/20 via-purple-600/20 to-pink-600/20 rounded-xl md:rounded-2xl p-6 md:p-10 border border-jellyfin-blue/40 shadow-2xl backdrop-blur-sm"
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.h2 
        className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8 flex items-center gap-2 md:gap-3"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <span className="text-3xl md:text-4xl">🎬</span>
        {t('stats.totalWatchTime')}
      </motion.h2>
      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            className="bg-black/40 rounded-lg md:rounded-xl p-4 md:p-6 backdrop-blur-md border border-white/10 hover:border-jellyfin-blue/50 hover:scale-105 hover:shadow-lg hover:shadow-jellyfin-blue/20"
            variants={itemVariants}
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="text-gray-400 text-xs md:text-sm mb-2 flex items-center gap-2">
              <span>{stat.icon}</span>
              {stat.label}
            </div>
            <div className="text-2xl md:text-4xl font-bold text-white bg-gradient-to-r from-white to-jellyfin-blue bg-clip-text text-transparent">
              {stat.value}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}

