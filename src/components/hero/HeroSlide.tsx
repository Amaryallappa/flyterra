import { useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import type { HeroSlideData } from '@/hooks/useHeroMedia'

interface HeroSlideProps {
  slide: HeroSlideData
  isActive: boolean
  isNext?: boolean
}

export default function HeroSlide({ slide, isActive }: HeroSlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Keep video playing seamlessly with zero delay
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const promise = video.play()
    if (promise !== undefined) {
      promise.catch(() => {
        // Autoplay handled by browser policy
      })
    }
  }, [isActive])

  return (
    <div
      className={`absolute inset-0 ${
        isActive ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
      }`}
    >
      {/* Background Media Container */}
      <div className="absolute inset-0 overflow-hidden bg-black">
        {/* Background Video Layer — Pure Video Hero (Always mounted for direct seamless transition) */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          loop
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover object-[50%_50%] opacity-85"
        >
          {slide.mobileVideoUrl && (
            <source src={slide.mobileVideoUrl} media="(max-width: 640px)" type="video/mp4" />
          )}
          <source src={slide.videoUrl} type="video/mp4" />
          <source src={`/media/hero/videos/hero-${slide.id}.mp4`} type="video/mp4" />
        </video>

        {/* DJI-Style Subtle Vignette & Top/Bottom Gradients */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/80" />
        {/* Ultra-fine grid texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.03]" />
      </div>

      {/* Slide Content Layer — DJI Centered Upper-Third Layout */}
      <div className="relative z-20 h-full w-full max-w-4xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center pt-28 sm:pt-32 md:pt-36">
        {/* Eyebrow Tag */}
        <p className="w-full text-xs sm:text-sm font-normal text-white/70 tracking-wider mb-2">
          {slide.tag}
        </p>

        {/* Product Title */}
        <h1 className="w-full text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight leading-tight">
          {slide.title}
        </h1>

        {/* Subtitle / Highlight */}
        <p className="w-full text-xl sm:text-2xl md:text-3xl font-light text-white/90 tracking-tight mt-1 mb-3">
          {slide.highlight}
        </p>

        {/* Crisp 1-Line Description */}
        <p className="w-full max-w-lg px-2 text-xs sm:text-sm md:text-base text-white/70 font-normal mx-auto mb-6 leading-relaxed break-words [overflow-wrap:anywhere]">
          {slide.description}
        </p>

        {/* DJI-Style Pill Action CTA */}
        <div className="flex w-full items-center justify-center">
          <Link
            to={slide.secondaryCta.href}
            className="inline-flex items-center justify-center gap-1.5 px-6 sm:px-7 py-2.5 rounded-full bg-white text-black font-medium text-xs sm:text-sm hover:bg-neutral-200 active:scale-[0.98] transition-all duration-200 shadow-md"
          >
            {slide.secondaryCta.label}
            <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  )
}
