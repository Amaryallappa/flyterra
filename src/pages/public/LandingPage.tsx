import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
  Compass,
  Cpu,
  Radio,
  Layers,
  User,
  Mail,
  ChevronUp,
} from 'lucide-react'
import HeroSlider from '@/components/hero/HeroSlider'
import { useHeroSlides } from '@/hooks/useHeroMedia'
import {
  LANDING_CARD_MEDIA,
  useLandingCardImages,
  useTechnologyImages,
} from '@/hooks/useLandingCardMedia'

const fieldCards = [
  {
    id: LANDING_CARD_MEDIA[0].id,
    title: 'Autonomous Spraying',
    subtitle: 'Precision RTK Aerial Crop Protection',
    link: '/register',
    defaultImageUrl: LANDING_CARD_MEDIA[0].fallbackUrl,
    fallbackUrl: '/media/hero/images/hero-poster-1.jpg',
  },
  {
    id: LANDING_CARD_MEDIA[1].id,
    title: 'Boundary Mapping',
    subtitle: 'Polygon Geometry & Obstacle Verification',
    link: '/register',
    defaultImageUrl: LANDING_CARD_MEDIA[1].fallbackUrl,
    fallbackUrl: '/media/hero/images/hero-poster-3.jpg',
  },
  {
    id: LANDING_CARD_MEDIA[2].id,
    title: 'On-Demand Fleet',
    subtitle: 'Instant Slot Scheduling & DGCA Safety',
    link: '/register',
    defaultImageUrl: LANDING_CARD_MEDIA[2].fallbackUrl,
    fallbackUrl: '/media/hero/images/hero-poster-2.jpg',
  },
]

const steps = [
  {
    step: '01',
    title: 'Register & Draw Farm',
    desc: 'Create your account in seconds and trace your field perimeter using satellite mapping.',
  },
  {
    step: '02',
    title: 'Operator Verification',
    desc: 'Certified local pilot checks boundary obstacle safety and uploads the autonomous QGC flight plan.',
  },
  {
    step: '03',
    title: 'Secure Online Booking',
    desc: 'Select your crop type, required chemical or bio-fertilizer, and pay securely per acre via Razorpay.',
  },
  {
    step: '04',
    title: 'Autonomous Flight & Live Feed',
    desc: 'The drone executes with micron-level atomization. Watch live telemetry and coverage right on your device.',
  },
]

const techHighlights = [
  {
    icon: Cpu,
    title: 'Intelligent Flow Rate Control',
    desc: 'Dynamic droplet regulation matches drone ground speed to eliminate over-saturation.',
  },
  {
    icon: Radio,
    title: 'Dual-Band Realtime Telemetry',
    desc: 'Encrypted long-range link feeds real-time coordinates, battery health, and tank volume.',
  },
  {
    icon: Compass,
    title: 'Multi-Directional Radar',
    desc: 'Terrain-following radar maintains precise canopy distance across rolling hills and orchards.',
  },
  {
    icon: Layers,
    title: 'Smart Cartridge Swapping',
    desc: 'Quick-release payload tanks and hot-swappable high-C batteries minimize turnaround time.',
  },
]

export default function LandingPage() {
  const slides = useHeroSlides()
  const landingCardImages = useLandingCardImages()
  const technologyImages = useTechnologyImages()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [subscribeEmail, setSubscribeEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        // Change header style when the below section reaches the halfway (1/2) mark of the hero
        const rect = contentRef.current.getBoundingClientRect()
        setScrolled(rect.top <= window.innerHeight * 0.5)
      } else {
        setScrolled(window.scrollY > window.innerHeight * 0.5)
      }
      setShowScrollTop(window.scrollY > 400)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* ── Sticky Slim Glassmorphic Navbar (Smooth Seamless Crossfade) ────── */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        {/* Background Layer 1: Clean White Frosted Glass (no border, soft shadow, smooth opacity fade) */}
        <div
          className={`absolute inset-0 bg-white/95 backdrop-blur-xl shadow-sm transition-opacity duration-500 ease-out pointer-events-none ${
            scrolled ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Background Layer 2: Subtle Dark Gradient when unscrolled */}
        <div
          className={`absolute inset-0 bg-gradient-to-b from-black/80 via-black/25 to-transparent transition-opacity duration-500 ease-out pointer-events-none ${
            scrolled ? 'opacity-0' : 'opacity-100'
          }`}
        />

        {/* Content Bar: Smooth padding and color transitions */}
        <div
          className={`relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between transition-all duration-500 ease-out ${
            scrolled ? 'py-2.5 text-neutral-900' : 'py-3.5 text-white'
          }`}
        >
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src={scrolled ? "/hecterra logo.svg" : "/hecterra-logo-white.svg"}
              alt="HECTERRA Logo"
              className="h-9 sm:h-10 w-auto object-contain transition-all duration-500 ease-out group-hover:scale-105"
            />
            <span
              className={`font-bold text-base sm:text-lg tracking-wider transition-colors duration-500 ease-out ${
                scrolled ? 'text-neutral-900' : 'text-white'
              }`}
            >
              HECTERRA
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div
            className={`hidden md:flex items-center gap-8 text-sm font-normal transition-colors duration-500 ease-out ${
              scrolled ? 'text-neutral-600' : 'text-white/80'
            }`}
          >
            <a
              href="#features"
              className={`transition-colors duration-300 ${
                scrolled ? 'hover:text-neutral-900' : 'hover:text-white'
              }`}
            >
              Capabilities
            </a>
            <a
              href="#technology"
              className={`transition-colors duration-300 ${
                scrolled ? 'hover:text-neutral-900' : 'hover:text-white'
              }`}
            >
              Technology
            </a>
            <a
              href="#how-it-works"
              className={`transition-colors duration-300 ${
                scrolled ? 'hover:text-neutral-900' : 'hover:text-white'
              }`}
            >
              Workflow
            </a>
            <a
              href="#pricing"
              className={`transition-colors duration-300 ${
                scrolled ? 'hover:text-neutral-900' : 'hover:text-white'
              }`}
            >
              Pricing
            </a>
          </div>

          {/* Action Icons + Pill CTA */}
          <div className="hidden md:flex items-center gap-4">
            {/* WhatsApp Contact with Number */}
            <a
              href="https://wa.me/917683999988"
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 ${
                scrolled
                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 shadow-xs'
                  : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md border border-white/20'
              }`}
              aria-label="Chat on WhatsApp 7683999988"
              title="Chat on WhatsApp: 7683999988"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5 fill-current text-emerald-500 flex-shrink-0"
              >
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.71 4.3 3.79.6.26 1.07.41 1.44.53.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.29z" />
              </svg>
              <span className="font-mono tracking-tight font-medium text-xs">7683999988</span>
            </a>
            <Link
              to="/login"
              className={`p-1 transition-colors duration-500 ease-out ${
                scrolled
                  ? 'text-neutral-600 hover:text-neutral-900'
                  : 'text-white/70 hover:text-white'
              }`}
              aria-label="Account sign in"
              title="Sign In"
            >
              <User size={17} />
            </Link>
            <Link
              to="/register"
              className={`px-4 py-1.5 rounded-full font-medium text-xs active:scale-[0.98] transition-all duration-500 ease-out shadow-sm ${
                scrolled
                  ? 'bg-[#18181B] text-white hover:bg-[#27272A]'
                  : 'bg-white text-black hover:bg-neutral-200'
              }`}
            >
              Book a Spray
            </Link>
          </div>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2.5 md:hidden">
            <a
              href="https://wa.me/917683999988"
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1.5 rounded-full transition-colors ${
                scrolled ? 'text-emerald-600 bg-emerald-50' : 'text-emerald-400 bg-white/10'
              }`}
              aria-label="WhatsApp"
              title="WhatsApp: 7683999988"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.49-.4-.42-.56-.43h-.47c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.77 2.71 4.3 3.79.6.26 1.07.41 1.44.53.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.29z" />
              </svg>
            </a>
            <Link
              to="/login"
              className={`p-1 transition-colors duration-500 ease-out ${
                scrolled ? 'text-neutral-700' : 'text-white/80'
              }`}
              aria-label="Account"
            >
              <User size={18} />
            </Link>
            <button
              onClick={() => setMobileMenuOpen((o) => !o)}
              className={`p-1.5 focus:outline-none transition-colors duration-500 ease-out ${
                scrolled ? 'text-neutral-900' : 'text-white/80'
              }`}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white/98 backdrop-blur-2xl border-b border-neutral-200 px-6 py-5 space-y-4 text-neutral-900 shadow-xl">
            <div className="flex flex-col space-y-2.5 text-sm font-normal text-neutral-700">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-neutral-900 py-1"
              >
                Capabilities
              </a>
              <a
                href="#technology"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-neutral-900 py-1"
              >
                Technology
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-neutral-900 py-1"
              >
                Workflow
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="hover:text-neutral-900 py-1"
              >
                Pricing
              </a>
            </div>
            <div className="pt-3 border-t border-neutral-200 flex flex-col gap-2">
              <Link
                to="/login"
                className="w-full text-center py-2 text-xs rounded-full bg-neutral-100 text-neutral-900 font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="w-full text-center py-2 text-xs rounded-full bg-[#18181B] text-white font-semibold"
              >
                Book a Spray
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── DJI-Style Fullscreen Hero Section (Sticky on scroll) ────────── */}
      <div className="sticky top-0 z-0">
        <HeroSlider />
      </div>

      {/* ── Content scrolls above sticky hero ─────────────────────────────── */}
      <div ref={contentRef} className="relative z-10 bg-white">
        {/* ── Key Metrics Showcase Bar (Clean White / Charcoal Style) ────────── */}
        <section className="bg-white border-y border-neutral-200/80 py-10 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { val: '10×', label: 'Faster Coverage', sub: 'vs manual backpack' },
              { val: '±2 cm', label: 'RTK Accuracy', sub: 'centimeter precision' },
              { val: '100%', label: 'Autonomous Flight', sub: 'pre-planned trajectory' },
              { val: '0', label: 'Chemical Contact', sub: 'complete operator safety' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center">
                <span className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
                  {stat.val}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-700 mt-1.5">
                  {stat.label}
                </span>
                <span className="text-xs text-neutral-400 mt-0.5">
                  {stat.sub}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Capabilities (DJI 3-Card Structure with Sharp Edges & Minimal Content) */}
      <section id="features" className="py-20 md:py-28 bg-[#F8F9FA] border-t border-neutral-200/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-neutral-900 tracking-tight">
              Built for Harsh Agricultural Realities.
            </h2>
            <p className="text-neutral-500 text-sm sm:text-base mt-3 font-normal max-w-2xl mx-auto">
              Autonomous aerial robotics designed from the ground up for maximum coverage,
              cost-efficiency, and operator simplicity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7">
            {fieldCards.map((card, idx) => (
              <div
                key={idx}
                className="group relative rounded-none overflow-hidden aspect-[4/5] sm:aspect-[3/4] md:h-[540px] flex flex-col justify-start p-7 sm:p-8 text-center bg-neutral-900 shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer"
              >
                {/* Background Image with smooth hover scale */}
                <img
                  src={landingCardImages[card.id]}
                  onError={(e) => {
                    const target = e.currentTarget
                    const fallbackStage = Number(target.dataset.fallbackStage || '0')
                    if (fallbackStage === 0) {
                      target.dataset.fallbackStage = '1'
                      target.src = card.defaultImageUrl
                    } else if (fallbackStage === 1) {
                      target.dataset.fallbackStage = '2'
                      target.src = card.fallbackUrl
                    }
                  }}
                  alt={card.title}
                  className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                  loading="lazy"
                />

                {/* Soft atmospheric sky top gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#0a2544]/80 via-[#0a2544]/25 to-transparent pointer-events-none" />

                {/* Minimal Top-Centered Card Content */}
                <div className="relative z-10 flex flex-col items-center pt-2 sm:pt-4">
                  <h3 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-2">
                    {card.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-white/90 font-light max-w-[260px] leading-relaxed mb-4">
                    {card.subtitle}
                  </p>
                  <Link
                    to={card.link}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white hover:text-white/80 transition-colors"
                  >
                    <span>Learn More</span>
                    <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Advanced Technology Section ───────────────────────────────────── */}
      <section id="technology" className="py-24 bg-white border-t border-neutral-200/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-3">
                Hardware Architecture
              </p>
              <h2 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight mb-4">
                Next-Generation Aerial Robotics.
              </h2>
              <p className="text-neutral-600 text-sm sm:text-base leading-relaxed mb-8">
                Every drone in the HECTERRA fleet is equipped with fail-safe telemetry,
                centimeter-precision RTK navigation, and precision centrifugal atomization
                nozzles to ensure zero pesticide drift.
              </p>

              <div className="space-y-3.5">
                {techHighlights.map((tech, i) => {
                  const Icon = tech.icon
                  return (
                    <div key={i} className="flex gap-4 p-4 rounded-xl bg-[#F8F9FA] border border-neutral-200/80">
                      <div className="w-9 h-9 rounded-lg bg-white border border-neutral-200 flex-shrink-0 flex items-center justify-center text-neutral-800 shadow-sm">
                        <Icon size={17} />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-900">{tech.title}</h4>
                        <p className="text-xs text-neutral-600 mt-1 leading-relaxed">{tech.desc}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="relative mx-auto w-full max-w-[620px] aspect-[4/5] max-h-[760px] rounded-3xl overflow-hidden border border-neutral-200/80 bg-neutral-900 shadow-2xl">
                <img
                  src={technologyImages[1] || slides[0]?.posterUrl || '/media/hero/images/hero-poster-1.jpg'}
                  onError={(e) => {
                    const target = e.currentTarget
                    const fallback = slides[0]?.fallbackImageUrl || '/media/hero/images/hero-poster-1.jpg'
                    if (target.dataset.fallbackStage !== 'hero-poster' && slides[0]?.posterUrl) {
                      target.dataset.fallbackStage = 'hero-poster'
                      target.src = slides[0].posterUrl
                    } else if (target.src !== fallback) {
                      target.dataset.fallbackStage = 'local-fallback'
                      target.src = fallback
                    }
                  }}
                  alt="Agricultural drone technology"
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                  <p className="text-xs font-medium tracking-[0.2em] text-white/75 uppercase">Precision agriculture</p>
                  <h3 className="mt-1 text-xl sm:text-2xl font-semibold text-white">Built for the field.</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4-Step Autonomous Workflow ──────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 md:py-32 bg-[#F8F9FA] border-t border-neutral-200/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-3">
              Mission Execution
            </p>
            <h2 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight">
              From Polygon to Precision Spray.
            </h2>
            <p className="text-neutral-600 text-base md:text-lg mt-3">
              Seamless 4-step workflow eliminates manual field coordination.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {steps.map((s, idx) => (
              <div
                key={idx}
                className="relative bg-white rounded-2xl p-7 border border-neutral-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="text-3xl font-bold font-mono text-neutral-300 mb-4">
                    {s.step}
                  </div>
                  <h3 className="text-base font-semibold text-neutral-900 mb-2">{s.title}</h3>
                  <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal">
                    {s.desc}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-neutral-100 text-xs font-mono text-neutral-500 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Fully Automated
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Transparent Pricing Section ───────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-white border-t border-neutral-200/80 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-3">
            Transparent Economics
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-neutral-900 tracking-tight mb-3">
            Pay Per Acre. Zero Hidden Fees.
          </h2>
          <p className="text-neutral-600 text-base mb-12">
            No equipment ownership costs, maintenance headaches, or operator overhead.
          </p>

          <div className="bg-[#18181B] rounded-3xl border border-neutral-800 p-8 sm:p-12 shadow-2xl relative overflow-hidden text-white">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-white/10">
              <div className="text-left">
                <span className="text-xs font-mono uppercase tracking-wider text-white/50">
                  Standard Precision Spray
                </span>
                <h3 className="text-2xl sm:text-3xl font-semibold text-white mt-1">
                  On-Demand Mission
                </h3>
              </div>
              <div className="text-right">
                <div className="text-xs font-mono text-white/50">STARTING RATE</div>
                <div className="text-3xl sm:text-4xl font-bold text-white">
                  ₹450 <span className="text-sm font-normal text-white/50">/ acre</span>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 py-8 text-left text-xs sm:text-sm text-white/80">
              {[
                'Centimeter RTK Flight Path',
                'Certified DGCA Drone Pilot',
                'Centrifugal Micron Atomization',
                'Live Telemetry & Field Dashboard',
                'Instant Mission Completion Report',
                'Full Insurance & Safety Coverage',
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-white/80 flex-shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <div className="pt-6">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 rounded-full bg-white text-neutral-900 font-semibold text-sm hover:bg-neutral-100 active:scale-[0.98] transition-all shadow-lg"
              >
                Book Your First Spray Mission
                <ChevronRight size={16} />
              </Link>
              <div className="text-xs font-mono text-white/40 mt-4">
                Instant Razorpay checkout with transparent GST invoice
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DJI-Grade Charcoal Gray Multi-Column Footer ─────────────────────── */}
      <footer className="bg-[#18181B] text-neutral-400 border-t border-neutral-800 pt-16 pb-12 text-xs relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Multi-Column Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-10 pb-14 border-b border-neutral-800">
            {/* Column 1: Product Categories & Service Plans */}
            <div className="space-y-8">
              <div>
                <h4 className="text-[13px] font-semibold text-white tracking-wide mb-3.5">
                  Fleet & Hardware
                </h4>
                <ul className="space-y-2.5 text-neutral-400 font-normal">
                  <li><a href="#technology" className="hover:text-white transition-colors">HECTERRA</a></li>
                  <li><a href="#technology" className="hover:text-white transition-colors">SWARM Fleet</a></li>
                  <li><a href="#technology" className="hover:text-white transition-colors">RTK Base Station</a></li>
                  <li><a href="#technology" className="hover:text-white transition-colors">Centrifugal Atomizers</a></li>
                  <li><a href="#technology" className="hover:text-white transition-colors">Docking Stations</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[13px] font-semibold text-white tracking-wide mb-3.5">
                  Service Plans
                </h4>
                <ul className="space-y-2.5 text-neutral-400 font-normal">
                  <li><a href="#pricing" className="hover:text-white transition-colors">HECTERRA Care Refresh</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Precision Crop Spraying</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Orchard Canopy Coverage</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Fleet Maintenance Program</a></li>
                </ul>
              </div>
            </div>

            {/* Column 2: Where to Buy & Cooperation */}
            <div className="space-y-8">
              <div>
                <h4 className="text-[13px] font-semibold text-white tracking-wide mb-3.5">
                  Where to Book
                </h4>
                <ul className="space-y-2.5 text-neutral-400 font-normal">
                  <li><Link to="/register" className="hover:text-white transition-colors">Book Spray Mission</Link></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Instant Acre Estimator</a></li>
                  <li><Link to="/login" className="hover:text-white transition-colors">Farmer Web App</Link></li>
                  <li><a href="#how-it-works" className="hover:text-white transition-colors">Regional Hub Network</a></li>
                  <li><a href="#how-it-works" className="hover:text-white transition-colors">FPO & Bulk Contracts</a></li>
                  <li><a href="#how-it-works" className="hover:text-white transition-colors">Flight GCS App</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[13px] font-semibold text-white tracking-wide mb-3.5">
                  Cooperation
                </h4>
                <ul className="space-y-2.5 text-neutral-400 font-normal">
                  <li><Link to="/admin/login" className="hover:text-white transition-colors">Apply For Authorized Hub</Link></li>
                  <li><a href="#" className="hover:text-white transition-colors">Agro-Chemical Partners</a></li>
                </ul>
              </div>
            </div>

            {/* Column 3: Fly Safe & Support */}
            <div className="space-y-8">
              <div>
                <h4 className="text-[13px] font-semibold text-white tracking-wide mb-3.5">
                  Fly Safe
                </h4>
                <ul className="space-y-2.5 text-neutral-400 font-normal">
                  <li><a href="#technology" className="hover:text-white transition-colors">DGCA Fly Safe Rules</a></li>
                  <li><a href="#technology" className="hover:text-white transition-colors">±2 cm RTK Guidance</a></li>
                  <li><a href="#technology" className="hover:text-white transition-colors">Weather Wind Protocols</a></li>
                  <li><a href="#technology" className="hover:text-white transition-colors">Fail-Safe Return-To-Home</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[13px] font-semibold text-white tracking-wide mb-3.5">
                  Support
                </h4>
                <ul className="space-y-2.5 text-neutral-400 font-normal">
                  <li><a href="#technology" className="hover:text-white transition-colors">Product Support</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Service Request and Inquiry</a></li>
                  <li><a href="#how-it-works" className="hover:text-white transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">After-Sales Service Policies</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Download Center</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Security and Privacy</a></li>
                </ul>
              </div>
            </div>

            {/* Column 4: Explore & Trending Now */}
            <div className="space-y-8">
              <div>
                <h4 className="text-[13px] font-semibold text-white tracking-wide mb-3.5">
                  Explore
                </h4>
                <ul className="space-y-2.5 text-neutral-400 font-normal">
                  <li><a href="#technology" className="hover:text-white transition-colors">Media Center</a></li>
                  <li><a href="#features" className="hover:text-white transition-colors">Buying Guides</a></li>
                  <li><a href="#technology" className="hover:text-white transition-colors">HECTERRA Trust Center</a></li>
                  <li><a href="#features" className="hover:text-white transition-colors">HECTERRA Blog</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[13px] font-semibold text-white tracking-wide mb-3.5">
                  Trending Now
                </h4>
                <ul className="space-y-2.5 text-neutral-400 font-normal">
                  <li><a href="#features" className="hover:text-white transition-colors">Centrifugal Micron Atomizers</a></li>
                  <li><a href="#features" className="hover:text-white transition-colors">Autonomous Swarm Control</a></li>
                  <li><a href="#features" className="hover:text-white transition-colors">High-C Smart Batteries</a></li>
                  <li><a href="#features" className="hover:text-white transition-colors">Portable Base Stations</a></li>
                  <li><a href="#features" className="hover:text-white transition-colors">Night Spray Thermal Kits</a></li>
                </ul>
              </div>
            </div>

            {/* Column 5: Community & Subscribe */}
            <div className="space-y-8 col-span-2 md:col-span-1">
              <div>
                <h4 className="text-[13px] font-semibold text-white tracking-wide mb-3.5">
                  Community
                </h4>
                <ul className="space-y-2.5 text-neutral-400 font-normal">
                  <li><Link to="/operator/login" className="hover:text-white transition-colors">Pilot Forum</Link></li>
                  <li><a href="#" className="hover:text-white transition-colors">Farmer Community</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Developer Portal</a></li>
                </ul>
              </div>
              <div>
                <h4 className="text-[13px] font-semibold text-white tracking-wide mb-2">
                  Subscribe
                </h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed mb-3">
                  Get the latest news from HECTERRA
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (subscribeEmail.trim()) {
                      setSubscribed(true)
                    }
                  }}
                  className="space-y-2"
                >
                  <div className="relative">
                    <input
                      type="email"
                      required
                      placeholder="Your email address"
                      value={subscribeEmail}
                      onChange={(e) => {
                        setSubscribeEmail(e.target.value)
                        setSubscribed(false)
                      }}
                      className="w-full bg-[#27272A] border border-neutral-700/80 rounded-md pl-3 pr-9 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-400 transition-colors"
                    />
                    <button
                      type="submit"
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
                      aria-label="Subscribe"
                    >
                      <Mail size={14} />
                    </button>
                  </div>
                  {subscribed && (
                    <div className="text-[11px] text-emerald-400 font-medium">
                      ✓ Subscribed! You will receive field updates.
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>

          {/* Sub-Footer Bar: Brand Logo + Company Links + Social Channels */}
          <div className="py-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-neutral-800">
            <div className="flex flex-wrap items-center gap-6">
              <Link to="/" className="flex items-center gap-3 group">
                <img
                  src="/hecterra-logo-white.svg"
                  alt="HECTERRA"
                  className="h-9 sm:h-10 w-auto object-contain group-hover:scale-105 transition-transform"
                />
                <span className="font-bold text-white tracking-wider text-base">
                  HECTERRA
                </span>
              </Link>

              <div className="flex flex-wrap items-center gap-5 text-xs text-neutral-300 font-normal">
                <a href="#features" className="hover:text-white transition-colors">Who We Are</a>
                <a href="#technology" className="hover:text-white transition-colors">Contact Us</a>
                <a href="#how-it-works" className="hover:text-white transition-colors">Careers</a>
                <Link to="/operator/login" className="hover:text-white transition-colors">Dealer Portal</Link>
                <Link to="/admin/login" className="hover:text-white transition-colors">Admin Console</Link>
              </div>
            </div>

            {/* Social Icons matching DJI exact layout */}
            <div className="flex items-center gap-4 text-neutral-400">
              <a href="#" className="hover:text-white transition-colors p-1" aria-label="Facebook">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className="hover:text-white transition-colors p-1" aria-label="X">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              <a href="#" className="hover:text-white transition-colors p-1" aria-label="YouTube">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a href="#" className="hover:text-white transition-colors p-1" aria-label="TikTok">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1.01-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </a>
              <a href="#" className="hover:text-white transition-colors p-1" aria-label="Instagram">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Bottom Legal & Compliance Notice */}
          <div className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-[11px] text-neutral-500 font-normal">
            <div className="space-y-1">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-neutral-400">
                <a href="#" className="hover:text-white transition-colors">HECTERRA Privacy Policy</a>
                <span>·</span>
                <a href="#" className="hover:text-white transition-colors">Use of Cookies</a>
                <span>·</span>
                <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
                <span>·</span>
                <a href="#" className="hover:text-white transition-colors">Business Information</a>
                <span>·</span>
                <a href="#" className="hover:text-white transition-colors">Accessibility</a>
              </div>
              <div>
                Copyright © {new Date().getFullYear()} HECTERRA All Rights Reserved. Feedback on web experience
              </div>
            </div>

            <div className="flex items-center gap-2 text-neutral-400 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              FLEET TELEMETRY ONLINE
            </div>
          </div>
        </div>

        {/* Floating Action Button */}
        {showScrollTop && (
          <div className="fixed bottom-6 right-6 z-40">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="w-10 h-10 rounded-full bg-white text-neutral-900 shadow-xl flex items-center justify-center hover:bg-neutral-100 hover:scale-105 active:scale-95 transition-all border border-neutral-200"
              title="Scroll to top"
              aria-label="Scroll to top"
            >
              <ChevronUp size={18} />
            </button>
          </div>
        )}
      </footer>
      </div>
    </div>
  )
}
