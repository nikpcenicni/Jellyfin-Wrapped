'use client'

interface PosterImageProps {
  src: string | null | undefined
  alt: string
  className?: string
  fallbackClassName?: string
}

export default function PosterImage({ src, alt, className = '', fallbackClassName = '' }: PosterImageProps) {
  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.target as HTMLImageElement
    target.style.display = 'none'
  }

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={handleError}
      />
    )
  }

  return (
    <div className={`bg-gradient-to-br from-gray-800 to-gray-900 ${fallbackClassName}`} />
  )
}

