'use client'

import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'

interface RevealSequenceProps {
  stats: {
    year: number
    totalWatchTime: any[]
    topMovies: any[]
    topShows: any[]
    monthlyActivity: any[]
  }
  useCase?: 'global' | 'server' | 'personal' | 'user' | 'family'
  onComplete: () => void
}

export default function RevealSequence({ stats, useCase = 'global', onComplete }: RevealSequenceProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [messages, setMessages] = useState<string[] | null>(null)
  const [loadingIntros, setLoadingIntros] = useState(true)
  const totalWatchTime = stats.totalWatchTime?.[0] || {}

  const formatHours = (hours: number) => {
    if (hours >= 1000) {
      return `${(hours / 1000).toFixed(1)}k hours`
    }
    return `${hours || 0} hours`
  }

  // Generate default/fallback messages (memoized to avoid recreation)
  const defaultMessages = useMemo((): string[] => {
    return [
      "Wow, there was a lot of media consumed this year!",
      `Everyone consumed ${formatHours(totalWatchTime.TotalHours || 0)}`,
      `That's ${totalWatchTime.TotalPlays?.toLocaleString() || 0} total plays`,
      `From ${totalWatchTime.UniqueItems?.toLocaleString() || 0} unique items`
    ]
  }, [totalWatchTime.TotalHours, totalWatchTime.TotalPlays, totalWatchTime.UniqueItems])

  // Fetch creative intro messages from OpenAI
  useEffect(() => {
    const fetchIntroMessages = async () => {
      try {
        const response = await axios.post('/api/intro', { stats, useCase })
        if (response.data?.messages && Array.isArray(response.data.messages) && response.data.messages.length >= 4) {
          setMessages(response.data.messages.slice(0, 4))
        } else {
          // Fallback to default messages
          setMessages(defaultMessages)
        }
      } catch (error) {
        console.warn('Failed to fetch AI-generated intros, using default messages:', error)
        // Fallback to default messages on error
        setMessages(defaultMessages)
      } finally {
        setLoadingIntros(false)
      }
    }

    fetchIntroMessages()
  }, [stats, useCase, defaultMessages])

  useEffect(() => {
    // Wait for messages to load before starting the sequence
    if (loadingIntros || !messages) {
      return
    }

    // Auto-advance through steps (starting immediately, no video delay)
    const steps = [
      0,    // First message
      2000, // Second message
      4000, // Third message
      6000, // Fourth message
    ]

    let timeouts: ReturnType<typeof setTimeout>[] = []
    
    steps.forEach((delay, index) => {
      const timeout = setTimeout(() => {
        setCurrentStep(index + 1)
      }, delay)
      timeouts.push(timeout)
    })

    // Complete reveal after last step
    const completeTimeout = setTimeout(() => {
      onComplete()
    }, 8000)

    timeouts.push(completeTimeout)

    return () => {
      timeouts.forEach(t => clearTimeout(t))
    }
  }, [onComplete, loadingIntros, messages])

  // Show loading state or use default messages while loading
  const displayMessages = messages || defaultMessages

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-jellyfin-darker via-jellyfin-dark to-gray-900 z-50 flex items-center justify-center">
      {/* Animated Text Messages */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full text-center">
          {displayMessages.map((message, index) => (
            <div
              key={index}
              className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ${
                currentStep === index + 1
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-8 scale-95'
              }`}
            >
              <div className="bg-black/70 backdrop-blur-md rounded-2xl md:rounded-3xl px-6 md:px-10 py-5 md:py-7 border-2 border-jellyfin-blue/40 shadow-2xl max-w-[90vw] md:max-w-2xl">
                <p className="text-xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">
                  {message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
