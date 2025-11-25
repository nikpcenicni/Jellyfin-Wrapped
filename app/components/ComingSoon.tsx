'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'

interface ComingSoonProps {
  unlockDate: string
  year: number
}

export default function ComingSoon({ unlockDate, year }: ComingSoonProps) {
  const t = useTranslations()
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime()
      const unlock = new Date(unlockDate).getTime()
      const difference = unlock - now

      if (difference > 0) {
        setTimeRemaining({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((difference % (1000 * 60)) / 1000)
        })
      } else {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }

    // Calculate immediately
    calculateTimeRemaining()

    // Update every second
    const interval = setInterval(calculateTimeRemaining, 1000)

    return () => clearInterval(interval)
  }, [unlockDate])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  }

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-[60vh] py-12 md:py-20"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div
        variants={itemVariants}
        className="text-center mb-8"
      >
        <motion.div
          className="text-6xl md:text-8xl mb-6"
          animate={{ 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          🎬
        </motion.div>
        <motion.h2
          className="text-3xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-jellyfin-blue via-purple-500 to-pink-500 bg-clip-text text-transparent"
          variants={itemVariants}
        >
          {t('comingSoon.title')}
        </motion.h2>
        <motion.p
          className="text-gray-400 text-lg md:text-xl mb-2"
          variants={itemVariants}
        >
          {t('comingSoon.message', { year })}
        </motion.p>
        <motion.p
          className="text-jellyfin-blue text-base md:text-lg font-semibold"
          variants={itemVariants}
        >
          {formatDate(unlockDate)}
        </motion.p>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 w-full max-w-4xl"
      >
        <motion.div
          className="bg-gradient-to-br from-jellyfin-blue/20 to-purple-600/20 rounded-xl p-6 md:p-8 border border-jellyfin-blue/40 backdrop-blur-sm"
          whileHover={{ scale: 1.05, y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-4xl md:text-5xl font-bold text-white mb-2">
            {timeRemaining.days}
          </div>
          <div className="text-gray-400 text-sm md:text-base uppercase tracking-wide">
            {t('comingSoon.days')}
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-6 md:p-8 border border-purple-500/40 backdrop-blur-sm"
          whileHover={{ scale: 1.05, y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-4xl md:text-5xl font-bold text-white mb-2">
            {String(timeRemaining.hours).padStart(2, '0')}
          </div>
          <div className="text-gray-400 text-sm md:text-base uppercase tracking-wide">
            {t('comingSoon.hours')}
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-pink-600/20 to-orange-500/20 rounded-xl p-6 md:p-8 border border-pink-500/40 backdrop-blur-sm"
          whileHover={{ scale: 1.05, y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-4xl md:text-5xl font-bold text-white mb-2">
            {String(timeRemaining.minutes).padStart(2, '0')}
          </div>
          <div className="text-gray-400 text-sm md:text-base uppercase tracking-wide">
            {t('comingSoon.minutes')}
          </div>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl p-6 md:p-8 border border-orange-500/40 backdrop-blur-sm"
          whileHover={{ scale: 1.05, y: -5 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-4xl md:text-5xl font-bold text-white mb-2">
            {String(timeRemaining.seconds).padStart(2, '0')}
          </div>
          <div className="text-gray-400 text-sm md:text-base uppercase tracking-wide">
            {t('comingSoon.seconds')}
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="mt-8 md:mt-12 text-center"
      >
        <p className="text-gray-500 text-sm md:text-base">
          {t('comingSoon.subtitle')}
        </p>
      </motion.div>
    </motion.div>
  )
}

