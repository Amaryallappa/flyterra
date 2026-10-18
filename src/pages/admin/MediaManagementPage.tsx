import { useState, useEffect, useRef } from 'react'
import {
  Film,
  Image as ImageIcon,
  Upload,
  Trash2,
  Play,
  ExternalLink,
  Copy,
  Check,
  Plus,
  AlertCircle,
  FolderOpen,
} from 'lucide-react'
import { supabase } from '@/api/supabase'
import { HERO_SLIDES } from '@/hooks/useHeroMedia'
import {
  LANDING_CARD_MEDIA,
  TECHNOLOGY_IMAGES,
  type LandingCardId,
  type TechnologyImageId,
  useLandingCardImages,
  useTechnologyImages,
} from '@/hooks/useLandingCardMedia'

export interface MediaItem {
  id: string
  name: string
  type: 'video' | 'image'
  category: 'hero-video' | 'hero-poster' | 'hero-thumb' | 'general'
  url: string
  size?: string
  dimensions?: string
  uploadedAt: string
  slideId?: number
}

// Initial built-in media catalogue
const INITIAL_MEDIA: MediaItem[] = [
  {
    id: 'vid-1',
    name: 'hero-1.mp4',
    type: 'video',
    category: 'hero-video',
    url: '/media/hero/videos/hero-1.mp4',
    size: '4.2 MB',
    dimensions: '1920 × 1080',
    uploadedAt: '2026-10-15',
    slideId: 1,
  },
  {
    id: 'vid-2',
    name: 'hero-2.mp4',
    type: 'video',
    category: 'hero-video',
    url: '/media/hero/videos/hero-2.mp4',
    size: '7.7 MB',
    dimensions: '1920 × 1080',
    uploadedAt: '2026-10-15',
    slideId: 2,
  },
  {
    id: 'vid-3',
    name: 'hero-3.mp4',
    type: 'video',
    category: 'hero-video',
    url: '/media/hero/videos/hero-3.mp4',
    size: '4.7 MB',
    dimensions: '1920 × 1080',
    uploadedAt: '2026-10-15',
    slideId: 3,
  },
  {
    id: 'img-1',
    name: 'hero-poster-1.jpg',
    type: 'image',
    category: 'hero-poster',
    url: '/media/hero/images/hero-poster-1.jpg',
    size: '514 KB',
    dimensions: '1920 × 1080',
    uploadedAt: '2026-10-15',
    slideId: 1,
  },
  {
    id: 'img-2',
    name: 'hero-poster-2.jpg',
    type: 'image',
    category: 'hero-poster',
    url: '/media/hero/images/hero-poster-2.jpg',
    size: '458 KB',
    dimensions: '1920 × 1080',
    uploadedAt: '2026-10-15',
    slideId: 2,
  },
  {
    id: 'img-3',
    name: 'hero-poster-3.jpg',
    type: 'image',
    category: 'hero-poster',
    url: '/media/hero/images/hero-poster-3.jpg',
    size: '413 KB',
    dimensions: '1920 × 1080',
    uploadedAt: '2026-10-15',
    slideId: 3,
  },
  {
    id: 'thumb-1',
    name: 'hero-thumb-1.jpg',
    type: 'image',
    category: 'hero-thumb',
    url: '/media/hero/images/hero-thumb-1.jpg',
    size: '16.4 KB',
    dimensions: '320 × 180',
    uploadedAt: '2026-10-15',
    slideId: 1,
  },
  {
    id: 'thumb-2',
    name: 'hero-thumb-2.jpg',
    type: 'image',
    category: 'hero-thumb',
    url: '/media/hero/images/hero-thumb-2.jpg',
    size: '15.3 KB',
    dimensions: '320 × 180',
    uploadedAt: '2026-10-15',
    slideId: 2,
  },
  {
    id: 'thumb-3',
    name: 'hero-thumb-3.jpg',
    type: 'image',
    category: 'hero-thumb',
    url: '/media/hero/images/hero-thumb-3.jpg',
    size: '14.6 KB',
    dimensions: '320 × 180',
    uploadedAt: '2026-10-15',
    slideId: 3,
  },
]

export default function MediaManagementPage() {
  const landingCardImages = useLandingCardImages()
  const technologyImages = useTechnologyImages()
  const [mediaList, setMediaList] = useState<MediaItem[]>(() => {
    const saved = localStorage.getItem('hecterra_admin_media')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return INITIAL_MEDIA
      }
    }
    return INITIAL_MEDIA
  })

  const [filterType, setFilterType] = useState<'all' | 'video' | 'image'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadCategory, setUploadCategory] = useState<MediaItem['category']>('hero-video')
  const [uploadSlideId, setUploadSlideId] = useState<number>(1)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  // Preview modal
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [uploadingLandingCard, setUploadingLandingCard] = useState<LandingCardId | null>(null)
  const [landingCardErrors, setLandingCardErrors] = useState<Partial<Record<LandingCardId, string>>>({})
  const [landingCardSuccess, setLandingCardSuccess] = useState<LandingCardId | null>(null)
  const [uploadingTechnologyImage, setUploadingTechnologyImage] = useState<TechnologyImageId | null>(null)
  const [technologyImageErrors, setTechnologyImageErrors] = useState<Partial<Record<TechnologyImageId, string>>>({})
  const [technologyImageSuccess, setTechnologyImageSuccess] = useState<TechnologyImageId | null>(null)

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleLandingCardUpload = async (cardId: LandingCardId, file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setLandingCardErrors((previous) => ({ ...previous, [cardId]: 'Choose a JPG, PNG, or WebP image.' }))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setLandingCardErrors((previous) => ({ ...previous, [cardId]: 'Image must be 10 MB or smaller.' }))
      return
    }

    setUploadingLandingCard(cardId)
    setLandingCardSuccess(null)
    setLandingCardErrors((previous) => ({ ...previous, [cardId]: undefined }))

    try {
      const card = LANDING_CARD_MEDIA.find((item) => item.id === cardId)
      if (!card) throw new Error('Could not find the landing page card.')

      const { data, error } = await supabase.storage
        .from('hecterra-media')
        .upload(card.objectPath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '0',
        })

      if (error) throw error
      if (!data) throw new Error('The image upload did not return a saved file.')

      setLandingCardSuccess(cardId)
      window.dispatchEvent(new Event('hecterra_landing_card_media_updated'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image upload failed. Please try again.'
      setLandingCardErrors((previous) => ({ ...previous, [cardId]: message }))
    } finally {
      setUploadingLandingCard(null)
    }
  }

  const handleTechnologyImageUpload = async (imageId: TechnologyImageId, file?: File) => {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setTechnologyImageErrors((previous) => ({ ...previous, [imageId]: 'Choose a JPG, PNG, or WebP image.' }))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setTechnologyImageErrors((previous) => ({ ...previous, [imageId]: 'Image must be 10 MB or smaller.' }))
      return
    }

    setUploadingTechnologyImage(imageId)
    setTechnologyImageSuccess(null)
    setTechnologyImageErrors((previous) => ({ ...previous, [imageId]: undefined }))

    try {
      const image = TECHNOLOGY_IMAGES.find((item) => item.id === imageId)
      if (!image) throw new Error('Could not find the technology image.')

      const { data, error } = await supabase.storage
        .from('hecterra-media')
        .upload(image.objectPath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '0',
        })

      if (error) throw error
      if (!data) throw new Error('The image upload did not return a saved file.')

      setTechnologyImageSuccess(imageId)
      window.dispatchEvent(new Event('hecterra_technology_media_updated'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image upload failed. Please try again.'
      setTechnologyImageErrors((previous) => ({ ...previous, [imageId]: message }))
    } finally {
      setUploadingTechnologyImage(null)
    }
  }

  // Save to localStorage whenever mediaList changes
  useEffect(() => {
    localStorage.setItem('hecterra_admin_media', JSON.stringify(mediaList))
    window.dispatchEvent(new Event('hecterra_media_updated'))
  }, [mediaList])

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadFile(file)
    setUploadTitle(file.name)
    setUploadError(null)

    const isVideo = file.type.startsWith('video/')
    setUploadCategory(isVideo ? 'hero-video' : 'hero-poster')

    const url = URL.createObjectURL(file)
    setUploadPreview(url)
  }

  // Handle Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadFile) {
      setUploadError('Please select a video or image file to upload.')
      return
    }

    setUploading(true)
    setUploadError(null)

    try {
      const isVideo = uploadFile.type.startsWith('video/')
      let publicUrl = ''

      // Attempt Supabase storage upload if configured
      try {
        const bucket = 'hecterra-media'
        const fileName = `${Date.now()}-${uploadFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        const path = `hero/${isVideo ? 'videos' : 'images'}/${fileName}`

        const { data, error: uploadErr } = await supabase.storage
          .from(bucket)
          .upload(path, uploadFile, { upsert: true })

        if (!uploadErr && data) {
          const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path)
          if (urlData?.publicUrl) {
            publicUrl = `${urlData.publicUrl}?t=${Date.now()}`
          }
        }
      } catch (sbErr) {
        console.warn('Supabase storage not accessible, using persistent blob fallback', sbErr)
      }

      if (!publicUrl) {
        publicUrl = uploadPreview || URL.createObjectURL(uploadFile)
      }

      const newItem: MediaItem = {
        id: `media-${Date.now()}`,
        name: uploadTitle || uploadFile.name,
        type: isVideo ? 'video' : 'image',
        category: uploadCategory,
        url: publicUrl,
        size: `${(uploadFile.size / (1024 * 1024)).toFixed(1)} MB`,
        dimensions: isVideo ? '1920 × 1080 (HD)' : 'Standard HD',
        uploadedAt: new Date().toISOString().split('T')[0],
        slideId: uploadSlideId,
      }

      setMediaList((prev) => [newItem, ...prev])
      setUploadSuccess(true)

      setTimeout(() => {
        setUploadModalOpen(false)
        setUploadFile(null)
        setUploadPreview(null)
        setUploadSuccess(false)
      }, 1000)
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Handle Delete
  const handleDelete = async (item: MediaItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return

    try {
      if (item.url.includes('storage/v1/object/public/hecterra-media/')) {
        const rawPath = item.url.split('/hecterra-media/')[1]
        const path = rawPath ? rawPath.split('?')[0] : ''
        if (path) {
          await supabase.storage.from('hecterra-media').remove([path])
        }
      }
    } catch (err) {
      console.warn('Could not remove from Supabase storage', err)
    }

    setMediaList((prev) => prev.filter((m) => m.id !== item.id))
    if (previewItem?.id === item.id) {
      setPreviewItem(null)
    }
  }

  // Copy URL to clipboard
  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // Filtered List
  const filteredList = mediaList.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false
    if (filterCategory !== 'all' && item.category !== filterCategory) return false
    if (searchQuery.trim() && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Media & Hero Assets
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Upload, manage, and assign fullscreen drone videos and posters for the website.
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-semibold hover:bg-neutral-800 transition-all shadow-sm active:scale-95"
        >
          <Plus size={16} />
          Upload New Media
        </button>
      </div>

      {/* Hero Slides Live Overview Cards */}
      <div className="grid md:grid-cols-3 gap-5">
        {HERO_SLIDES.map((slide) => {
          const slideVideos = mediaList.filter(
            (m) => m.type === 'video' && m.slideId === slide.id
          )
          const slideImages = mediaList.filter(
            (m) => m.type === 'image' && m.slideId === slide.id
          )

          return (
            <div
              key={slide.id}
              className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-400">
                  Slide {slide.id} Target
                </span>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800">
                  Active in Hero
                </span>
              </div>

              <div>
                <h3 className="font-bold text-gray-900 text-base">{slide.name}</h3>
                <p className="text-xs text-gray-500 line-clamp-1">{slide.highlight} {slide.description}</p>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-neutral-100 text-xs text-neutral-600">
                <div className="flex items-center gap-1.5">
                  <Film size={14} className="text-neutral-500" />
                  <span>{slideVideos.length} Video{slideVideos.length !== 1 ? 's' : ''}</span>
                </div>
                <span className="text-neutral-300">·</span>
                <div className="flex items-center gap-1.5">
                  <ImageIcon size={14} className="text-neutral-500" />
                  <span>{slideImages.length} Image{slideImages.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Landing Page Card Images */}
      <section className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Landing Page Card Images</h2>
          <p className="text-xs text-gray-500 mt-1">
            Replace the images shown in the three capability cards on the public home page.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {LANDING_CARD_MEDIA.map((card) => (
            <div key={card.id} className="overflow-hidden rounded-xl border border-neutral-200">
              <img
                src={landingCardImages[card.id]}
                alt={card.title}
                onError={(event) => {
                  event.currentTarget.src = card.fallbackUrl
                }}
                className="h-40 w-full object-cover"
              />
              <div className="space-y-2 p-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{card.title}</h3>
                  <p className="text-xs text-gray-500">{card.description}</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800">
                  <Upload size={14} />
                  {uploadingLandingCard === card.id ? 'Uploading…' : 'Upload replacement'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploadingLandingCard !== null}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0]
                      void handleLandingCardUpload(card.id, file)
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
                {landingCardErrors[card.id] && (
                  <p role="alert" className="text-xs text-red-600">{landingCardErrors[card.id]}</p>
                )}
                {landingCardSuccess === card.id && (
                  <p role="status" className="text-xs text-emerald-700">Image updated on the public page.</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400">JPG, PNG, or WebP · Maximum 10 MB per image</p>
      </section>

      {/* Technology Section Images */}
      <section className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-gray-900">Technology Section Images</h2>
          <p className="text-xs text-gray-500 mt-1">
            Replace the single vertical image displayed beside the technology details.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {TECHNOLOGY_IMAGES.map((image) => (
            <div key={image.id} className="overflow-hidden rounded-xl border border-neutral-200">
              <img
                src={technologyImages[image.id] || HERO_SLIDES[0].posterUrl}
                alt={`${image.name} technology`}
                onError={(event) => {
                  event.currentTarget.src = HERO_SLIDES[0].fallbackImageUrl
                }}
                className="h-40 w-full object-cover"
              />
              <div className="space-y-2 p-3">
                <h3 className="text-sm font-semibold text-gray-900">{image.name}</h3>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800">
                  <Upload size={14} />
                  {uploadingTechnologyImage === image.id ? 'Uploading…' : 'Upload replacement'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploadingTechnologyImage !== null}
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0]
                      void handleTechnologyImageUpload(image.id, file)
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
                {technologyImageErrors[image.id] && (
                  <p role="alert" className="text-xs text-red-600">{technologyImageErrors[image.id]}</p>
                )}
                {technologyImageSuccess === image.id && (
                  <p role="status" className="text-xs text-emerald-700">Technology image updated.</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400">Stored in hecterra-media / landing page technology card images · JPG, PNG, or WebP · Maximum 10 MB per image</p>
      </section>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Type Filter */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              All Assets ({mediaList.length})
            </button>
            <button
              onClick={() => setFilterType('video')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'video' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Videos ({mediaList.filter((m) => m.type === 'video').length})
            </button>
            <button
              onClick={() => setFilterType('image')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filterType === 'image' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Images ({mediaList.filter((m) => m.type === 'image').length})
            </button>
          </div>

          {/* Category Dropdown */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2 text-gray-700 focus:outline-none focus:ring-1 focus:ring-neutral-400"
          >
            <option value="all">All Categories</option>
            <option value="hero-video">Hero Fullscreen Video</option>
            <option value="hero-poster">Hero High-Res Poster</option>
            <option value="hero-thumb">Hero Navigation Thumb</option>
            <option value="general">General Asset</option>
          </select>
        </div>

        {/* Search Field */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="Search by file name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-gray-800 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400"
          />
        </div>
      </div>

      {/* Media Items Grid */}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredList.map((item) => (
          <div
            key={item.id}
            className="group bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            {/* Visual Thumbnail / Preview */}
            <div
              className="relative aspect-video bg-neutral-900 flex items-center justify-center overflow-hidden cursor-pointer"
              onClick={() => setPreviewItem(item)}
            >
              {item.type === 'video' ? (
                <div className="w-full h-full relative flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                  <video
                    src={item.url}
                    className="w-full h-full object-cover opacity-80"
                    muted
                    loop
                    playsInline
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause()
                      e.currentTarget.currentTime = 0
                    }}
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/90 text-neutral-900 flex items-center justify-center shadow-lg">
                      <Play size={18} className="ml-0.5" />
                    </div>
                  </div>
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-black/60 text-white backdrop-blur-md">
                    MP4 VIDEO
                  </span>
                </div>
              ) : (
                <div className="w-full h-full relative group-hover:scale-105 transition-transform duration-300">
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-black/60 text-white backdrop-blur-md">
                    IMAGE
                  </span>
                </div>
              )}

              {item.slideId && (
                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900/80 text-white backdrop-blur-md">
                  Slide #{item.slideId}
                </span>
              )}
            </div>

            {/* Details & Actions */}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 text-sm truncate" title={item.name}>
                  {item.name}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                  <span>{item.size || 'HD'}</span>
                  <span>·</span>
                  <span>{item.dimensions || '16:9'}</span>
                  <span>·</span>
                  <span>{item.uploadedAt}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                <button
                  onClick={() => copyUrl(item.url, item.id)}
                  className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-neutral-900 transition-colors"
                  title="Copy URL"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check size={14} className="text-emerald-500" />
                      <span className="text-emerald-600 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy URL</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-neutral-400 hover:text-neutral-900 transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 transition-colors"
                    title="Delete Media"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredList.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-neutral-200/80">
            <FolderOpen size={40} className="mx-auto text-neutral-300 mb-3" />
            <h3 className="text-base font-semibold text-gray-900">No media items found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              No files match your current filters. Try resetting the filters or upload new media.
            </p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-900 font-bold">
                  <Upload size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Upload Hero Media</h3>
                  <p className="text-xs text-gray-500">Add videos or images to the platform</p>
                </div>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 pt-4">
              {/* File Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-200 rounded-2xl p-6 text-center cursor-pointer hover:border-neutral-400 transition-colors bg-neutral-50/50"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="video/mp4,image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                {uploadPreview ? (
                  <div className="space-y-2">
                    {uploadFile?.type.startsWith('video/') ? (
                      <video src={uploadPreview} className="max-h-36 mx-auto rounded-lg" controls />
                    ) : (
                      <img src={uploadPreview} alt="Preview" className="max-h-36 mx-auto rounded-lg object-contain" />
                    )}
                    <p className="text-xs font-semibold text-gray-900">{uploadFile?.name}</p>
                    <p className="text-[11px] text-gray-400">Click to choose another file</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload size={28} className="mx-auto text-neutral-400" />
                    <p className="text-xs font-medium text-gray-700">
                      Click to browse or drop video/image here
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Supports MP4 (up to 25MB), WebP, JPG, PNG (1920×1080 recommended)
                    </p>
                  </div>
                )}
              </div>

              {/* Title / Label */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Media Title / File Name
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. hero-t40-video.mp4"
                  className="w-full text-xs border border-neutral-200 rounded-xl px-3.5 py-2.5 text-gray-900 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
              </div>

              {/* Category & Target Slide */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Asset Category
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as any)}
                    className="w-full text-xs border border-neutral-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none"
                  >
                    <option value="hero-video">Hero Video (.mp4)</option>
                    <option value="hero-poster">Hero High-Res Poster</option>
                    <option value="hero-thumb">Hero Navigation Thumb</option>
                    <option value="general">General Asset</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Assign to Hero Slide
                  </label>
                  <select
                    value={uploadSlideId}
                    onChange={(e) => setUploadSlideId(Number(e.target.value))}
                    className="w-full text-xs border border-neutral-200 rounded-xl px-3 py-2 text-gray-800 focus:outline-none"
                  >
                    <option value={1}>Slide 1: HECTERRA</option>
                    <option value={2}>Slide 2: SWARM</option>
                    <option value={3}>Slide 3: RTK</option>
                  </select>
                </div>
              </div>

              {uploadError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl text-xs flex items-center gap-2 font-medium">
                  <Check size={15} />
                  <span>Media uploaded and linked successfully!</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-gray-600 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Processing & Uploading...' : 'Upload & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-neutral-900 rounded-3xl max-w-3xl w-full p-6 text-white space-y-4 border border-neutral-800">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="font-bold text-base">{previewItem.name}</h3>
                <p className="text-xs text-neutral-400">
                  {previewItem.dimensions} · {previewItem.size}
                </p>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="text-neutral-400 hover:text-white text-base font-semibold"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              {previewItem.type === 'video' ? (
                <video src={previewItem.url} controls autoPlay className="w-full h-full object-contain" />
              ) : (
                <img src={previewItem.url} alt={previewItem.name} className="w-full h-full object-contain" />
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <span className="font-mono text-neutral-400 truncate max-w-md">{previewItem.url}</span>
              <button
                onClick={() => copyUrl(previewItem.url, previewItem.id)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-medium"
              >
                Copy URL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
