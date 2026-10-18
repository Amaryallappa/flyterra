import { useState, useEffect, useCallback, useRef } from 'react'
import HeroSlide from './HeroSlide'
import HeroNav from './HeroNav'
import { useHeroSlides } from '@/hooks/useHeroMedia'

export default function HeroSlider() {
  const slides = useHeroSlides()
  const [current, setCurrent] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const touchStartX = useRef<number | null>(null)
  const total = slides.length

  const nextSlide = useCallback(() => {
    setCurrent((prev) => (prev + 1) % total)
  }, [total])

  const prevSlide = useCallback(() => {
    setCurrent((prev) => (prev - 1 + total) % total)
  }, [total])

  // Autoplay ticker
  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(() => {
      nextSlide()
    }, 7000)

    return () => clearInterval(timer)
  }, [isPlaying, nextSlide])

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      if (diff > 0) nextSlide()
      else prevSlide()
    }
    touchStartX.current = null
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide()
      if (e.key === 'ArrowLeft') prevSlide()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [nextSlide, prevSlide])

  return (
    <section
      className="relative w-full h-[max(100svh,56.25vw)] min-h-[640px] bg-black overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Hero Showcase"
    >
      {/* Slides */}
      {slides.map((slide, index) => {
        const isActive = index === current
        const isNext = index === (current + 1) % total
        return (
          <HeroSlide
            key={slide.id}
            slide={slide}
            isActive={isActive}
            isNext={isNext}
          />
        )
      })}

      {/* Navigation Controls */}
      <HeroNav
        slides={slides}
        total={total}
        current={current}
        isPlaying={isPlaying}
        onSelect={(index) => setCurrent(index)}
        onPrev={prevSlide}
        onNext={nextSlide}
        onTogglePlay={() => setIsPlaying((p) => !p)}
      />
    </section>
  )
}
