import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { HeroSlideData } from '@/hooks/useHeroMedia'

interface HeroNavProps {
  slides?: HeroSlideData[]
  total?: number
  current?: number
  isPlaying?: boolean
  onSelect?: (index: number) => void
  onPrev: () => void
  onNext: () => void
  onTogglePlay?: () => void
}

export default function HeroNav({
  onPrev,
  onNext,
}: HeroNavProps) {
  return (
    <>
      {/* ── Screen-Edge Left Navigation Arrow ──────────────────────────────── */}
      <button
        onClick={onPrev}
        className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-black/40 backdrop-blur-sm transition-all duration-200 focus:outline-none"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
      </button>

      {/* ── Screen-Edge Right Navigation Arrow ─────────────────────────────── */}
      <button
        onClick={onNext}
        className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-black/40 backdrop-blur-sm transition-all duration-200 focus:outline-none"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" strokeWidth={1.5} />
      </button>
    </>
  )
}
