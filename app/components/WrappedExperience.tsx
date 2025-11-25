'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import axios from 'axios'

interface Slide {
  title: string
  description: string
  funFact: string | null
}

interface WrappedExperienceProps {
  stats: any
  userName?: string | null
  userId?: string | null
  onComplete: () => void
}

const SLIDE_DURATION = 10000 // 10 seconds per slide

export default function WrappedExperience({ stats, userName, userId, onComplete }: WrappedExperienceProps) {
  const t = useTranslations()
  const [slides, setSlides] = useState<Slide[]>([])
  const [currentSlide, setCurrentSlide] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get current locale from localStorage or browser
  const getLocale = () => {
    if (typeof window === 'undefined') return 'en'
    const saved = localStorage.getItem('jellyfin_locale')
    if (saved && ['en', 'de', 'es', 'fr'].includes(saved)) {
      return saved
    }
    return document.documentElement.lang || 'en'
  }
  
  const locale = getLocale()

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        setLoading(true)
        const response = await axios.post('/api/wrapped/insights', {
          stats,
          language: locale,
          userName,
          userId
        })
        
        if (response.data.slides && response.data.slides.length > 0) {
          setSlides(response.data.slides)
        } else {
          setError(t('wrapped.errorGenerating'))
        }
      } catch (err: any) {
        console.error('Error fetching wrapped insights:', err)
        setError(err.response?.data?.error || t('wrapped.errorGenerating'))
      } finally {
        setLoading(false)
      }
    }

    if (stats) {
      fetchInsights()
    }
  }, [stats, userName, locale, t])

  // Auto-advance slides
  useEffect(() => {
    if (slides.length === 0 || loading) return

    if (currentSlide >= slides.length) {
      // All slides shown, complete the experience
      setTimeout(() => {
        onComplete()
      }, 500)
      return
    }

    const timer = setTimeout(() => {
      setCurrentSlide(prev => prev + 1)
    }, SLIDE_DURATION)

    return () => clearTimeout(timer)
  }, [currentSlide, slides.length, loading, onComplete])

  // Skip on click or keypress
  useEffect(() => {
    const handleSkip = () => {
      if (currentSlide < slides.length) {
        setCurrentSlide(prev => prev + 1)
      } else {
        onComplete()
      }
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        handleSkip()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [currentSlide, slides.length, onComplete])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-jellyfin-darker via-jellyfin-dark to-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-16 h-16 border-4 border-gray-700 border-t-jellyfin-blue rounded-full mx-auto mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-white text-lg">{t('wrapped.generating')}</p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-jellyfin-darker via-jellyfin-dark to-gray-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-jellyfin-blue text-white rounded-xl hover:bg-blue-600 transition-colors"
          >
            {t('common.close')}
          </button>
        </motion.div>
      </div>
    )
  }

  if (slides.length === 0) {
    return null
  }

  const slide = slides[currentSlide]
  const previousProgress = (currentSlide / slides.length) * 100
  const currentProgress = ((currentSlide + 1) / slides.length) * 100

  return (
    <div 
      className="fixed inset-0 z-50 bg-gradient-to-br from-jellyfin-darker via-jellyfin-dark to-gray-900 cursor-pointer"
      onClick={() => {
        if (currentSlide < slides.length - 1) {
          setCurrentSlide(prev => prev + 1)
        } else {
          onComplete()
        }
      }}
    >
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gray-800">
        <motion.div
          key={currentSlide}
          className="h-full bg-gradient-to-r from-jellyfin-blue to-purple-500"
          initial={{ width: `${previousProgress}%` }}
          animate={{ width: `${currentProgress}%` }}
          transition={{ duration: SLIDE_DURATION / 1000, ease: "linear" }}
        />
      </div>

      {/* Skip button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onComplete()
        }}
        className="absolute top-4 right-4 px-4 py-2 bg-gray-800/80 backdrop-blur-sm text-white rounded-lg hover:bg-gray-700 transition-colors text-sm z-10"
      >
        {t('wrapped.skip')}
      </button>

      {/* Slide content */}
      <AnimatePresence mode="wait">
        {slide && (
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1, y: -20 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="h-full flex flex-col items-center justify-center px-6 text-center"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-jellyfin-blue/5 rounded-full blur-3xl"></div>
              <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl"></div>
            </div>

            {/* Slide number indicator */}
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 text-gray-500 text-sm">
              {currentSlide + 1} / {slides.length}
            </div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 bg-gradient-to-r from-white via-jellyfin-blue to-white bg-clip-text text-transparent relative z-10"
            >
              {slide.title}
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-xl md:text-2xl lg:text-3xl text-gray-300 max-w-4xl mb-8 relative z-10 leading-relaxed"
            >
              {slide.description}
            </motion.p>

            {/* Fun fact */}
            {slide.funFact && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="mt-8 px-6 py-4 bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-700/50 relative z-10"
              >
                <p className="text-lg md:text-xl text-jellyfin-blue font-semibold">
                  {slide.funFact}
                </p>
              </motion.div>
            )}

            {/* Tap/Click hint */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="absolute bottom-8 text-gray-500 text-sm"
            >
              {t('wrapped.tapToContinue')}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

