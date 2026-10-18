import { useEffect, useState } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const BUCKET = 'hecterra-media'
const LANDING_CARD_FOLDER = 'landing page card images'

export const LANDING_CARD_MEDIA = [
  {
    id: 'autonomous-spraying',
    title: 'Autonomous Spraying',
    description: 'Precision RTK Aerial Crop Protection',
    objectPath: `${LANDING_CARD_FOLDER}/autonomous-spraying`,
    fallbackUrl: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'boundary-mapping',
    title: 'Boundary Mapping',
    description: 'Polygon Geometry & Obstacle Verification',
    objectPath: `${LANDING_CARD_FOLDER}/boundary-mapping`,
    fallbackUrl: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?auto=format&fit=crop&w=1200&q=85',
  },
  {
    id: 'on-demand-fleet',
    title: 'On-Demand Fleet',
    description: 'Instant Slot Scheduling & DGCA Safety',
    objectPath: `${LANDING_CARD_FOLDER}/on-demand-fleet`,
    fallbackUrl: 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=1200&q=85',
  },
] as const

export type LandingCardId = (typeof LANDING_CARD_MEDIA)[number]['id']
export type TechnologyImageId = 1

export const TECHNOLOGY_IMAGES = [
  { id: 1, name: 'Technology Section', objectPath: 'landing page technology card images/hecterra' },
] as const

function getPublicImageUrl(id: LandingCardId, cacheKey: number): string {
  const card = LANDING_CARD_MEDIA.find((item) => item.id === id)
  if (!card) throw new Error(`Unknown landing card: ${id}`)
  if (!SUPABASE_URL) return card.fallbackUrl

  const encodedPath = card.objectPath.split('/').map(encodeURIComponent).join('/')
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodedPath}?t=${cacheKey}`
}

function getAllPublicImageUrls(cacheKey: number): Record<LandingCardId, string> {
  return Object.fromEntries(
    LANDING_CARD_MEDIA.map(({ id }) => [id, getPublicImageUrl(id, cacheKey)])
  ) as Record<LandingCardId, string>
}

export function useLandingCardImages(): Record<LandingCardId, string> {
  const [images, setImages] = useState(() => getAllPublicImageUrls(Date.now()))

  useEffect(() => {
    const handleUpdate = () => setImages(getAllPublicImageUrls(Date.now()))
    window.addEventListener('hecterra_landing_card_media_updated', handleUpdate)
    return () => window.removeEventListener('hecterra_landing_card_media_updated', handleUpdate)
  }, [])

  return images
}

export function useTechnologyImages(): Record<number, string> {
  const [images, setImages] = useState(() => getTechnologyImageUrls(Date.now()))

  useEffect(() => {
    const handleUpdate = () => setImages(getTechnologyImageUrls(Date.now()))
    window.addEventListener('hecterra_technology_media_updated', handleUpdate)
    return () => window.removeEventListener('hecterra_technology_media_updated', handleUpdate)
  }, [])

  return images
}

function getTechnologyImageUrls(cacheKey: number): Record<number, string> {
  return Object.fromEntries(
    TECHNOLOGY_IMAGES.map(({ id, objectPath }) => [
      id,
      SUPABASE_URL
        ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath.split('/').map(encodeURIComponent).join('/')}?t=${cacheKey}`
        : '',
    ])
  ) as Record<number, string>
}
