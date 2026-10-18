import { useState, useEffect } from 'react'

export interface HeroSlideData {
  id: number
  name: string
  navLabel: string
  tag: string
  title: string
  highlight: string
  description: string
  specs: { label: string; value: string }[]
  videoUrl: string
  mobileVideoUrl?: string
  posterUrl: string
  thumbUrl: string
  fallbackImageUrl: string
  primaryCta: { label: string; to: string }
  secondaryCta: { label: string; href: string }
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const STORAGE_BASE = SUPABASE_URL 
  ? `${SUPABASE_URL}/storage/v1/object/public/hecterra-media`
  : '/media'

// Timestamp generated once per page load to bust browser & CDN caching of updated Supabase assets
const CACHE_BUST = Date.now()

export function withCacheBuster(url: string, timestamp: number = CACHE_BUST): string {
  if (!url) return url
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  try {
    const urlObj = new URL(url, window.location.origin)
    urlObj.searchParams.set('t', timestamp.toString())
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return `${urlObj.pathname}${urlObj.search}`
    }
    return urlObj.toString()
  } catch {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}t=${timestamp}`
  }
}

export const HERO_SLIDES: HeroSlideData[] = [
  {
    id: 1,
    name: 'HECTERRA',
    navLabel: 'HECTERRA',
    tag: 'Autonomous Agricultural Drone',
    title: 'HECTERRA',
    highlight: 'Lead the Scene.',
    description: 'Centimeter RTK precision flight delivers uniform crop coverage with zero chemical waste.',
    specs: [
      { label: 'EFFICIENCY', value: '40 Acres / hr' },
      { label: 'PRECISION', value: '±2 cm RTK' },
      { label: 'RESPONSE', value: '< 24 Hours' },
    ],
    videoUrl: `${STORAGE_BASE}/hero/videos/hero-1.mp4`,
    mobileVideoUrl: `${STORAGE_BASE}/hero/videos/hero-1-mobile.mp4`,
    posterUrl: withCacheBuster(`${STORAGE_BASE}/hero/images/hero-poster-1.jpg`),
    thumbUrl: withCacheBuster(`${STORAGE_BASE}/hero/images/hero-thumb-1.jpg`),
    fallbackImageUrl: withCacheBuster('/media/hero/images/hero-poster-1.jpg'),
    primaryCta: { label: 'Learn More', to: '/register' },
    secondaryCta: { label: 'Book a Spray', href: '/register' },
  },
  {
    id: 2,
    name: 'SWARM',
    navLabel: 'SWARM',
    tag: 'Intelligent Multi-Drone Fleet',
    title: 'SWARM',
    highlight: 'Autonomous Scale.',
    description: 'Fully automated trajectory planning with real-time obstacle avoidance and live telemetry.',
    specs: [
      { label: 'PAYLOAD', value: '16L Smart Tank' },
      { label: 'COVERAGE', value: '100% Uniform' },
      { label: 'SAFETY', value: 'DGCA Certified' },
    ],
    videoUrl: `${STORAGE_BASE}/hero/videos/hero-2.mp4`,
    mobileVideoUrl: `${STORAGE_BASE}/hero/videos/hero-2-mobile.mp4`,
    posterUrl: withCacheBuster(`${STORAGE_BASE}/hero/images/hero-poster-2.jpg`),
    thumbUrl: withCacheBuster(`${STORAGE_BASE}/hero/images/hero-thumb-2.jpg`),
    fallbackImageUrl: withCacheBuster('/media/hero/images/hero-poster-2.jpg'),
    primaryCta: { label: 'Learn More', to: '/register' },
    secondaryCta: { label: 'Book a Spray', href: '/register' },
  },
  {
    id: 3,
    name: 'RTK',
    navLabel: 'RTK',
    tag: 'Real-Time Flight Telemetry',
    title: 'RTK',
    highlight: 'Direct to Phone.',
    description: 'Track altitude, tank pressure, and completed hectares live with instant mission analytics.',
    specs: [
      { label: 'STREAMING', value: 'Live 1080p Telemetry' },
      { label: 'VERIFICATION', value: 'Instant QGC Path' },
      { label: 'PAYMENT', value: 'Pay Per Acre' },
    ],
    videoUrl: `${STORAGE_BASE}/hero/videos/hero-3.mp4`,
    mobileVideoUrl: `${STORAGE_BASE}/hero/videos/hero-3-mobile.mp4`,
    posterUrl: withCacheBuster(`${STORAGE_BASE}/hero/images/hero-poster-3.jpg`),
    thumbUrl: withCacheBuster(`${STORAGE_BASE}/hero/images/hero-thumb-3.jpg`),
    fallbackImageUrl: withCacheBuster('/media/hero/images/hero-poster-3.jpg'),
    primaryCta: { label: 'Learn More', to: '/register' },
    secondaryCta: { label: 'Book a Spray', href: '/register' },
  },
]

function getMergedSlides(): HeroSlideData[] {
  try {
    const raw = localStorage.getItem('hecterra_admin_media')
    if (!raw) return HERO_SLIDES
    const items = JSON.parse(raw) as Array<{
      category: string
      url: string
      slideId?: number
    }>
    if (!Array.isArray(items)) return HERO_SLIDES

    return HERO_SLIDES.map((slide) => {
      const videoOverride = items.find(
        (i) => i.slideId === slide.id && i.category === 'hero-video'
      )
      const posterOverride = items.find(
        (i) => i.slideId === slide.id && i.category === 'hero-poster'
      )
      const thumbOverride = items.find(
        (i) => i.slideId === slide.id && i.category === 'hero-thumb'
      )

      return {
        ...slide,
        videoUrl: videoOverride ? videoOverride.url : slide.videoUrl,
        posterUrl: posterOverride ? withCacheBuster(posterOverride.url) : slide.posterUrl,
        thumbUrl: thumbOverride ? withCacheBuster(thumbOverride.url) : slide.thumbUrl,
        fallbackImageUrl: posterOverride ? withCacheBuster(posterOverride.url) : slide.fallbackImageUrl,
      }
    })
  } catch {
    return HERO_SLIDES
  }
}

export function useHeroSlides(): HeroSlideData[] {
  const [slides, setSlides] = useState<HeroSlideData[]>(() => getMergedSlides())

  useEffect(() => {
    const handleUpdate = () => {
      setSlides(getMergedSlides())
    }
    window.addEventListener('hecterra_media_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)
    return () => {
      window.removeEventListener('hecterra_media_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  return slides
}
