import { Link } from 'react-router-dom'
import { CheckCircle, Zap, MapPin, Clock, ShieldCheck, ChevronRight } from 'lucide-react'

const features = [
  { icon: Zap,         title: 'Autonomous Spraying',  desc: 'GPS-precision drone covers your entire field in a fraction of manual time.' },
  { icon: MapPin,      title: 'Field Boundary Mapping', desc: 'Draw your field boundary once. Our operator verifies and we\'re ready to fly.' },
  { icon: Clock,       title: 'Flexible Scheduling',  desc: 'Pick date & time that works for you. No waiting — slots show real availability.' },
  { icon: ShieldCheck, title: 'Safe & Certified',     desc: 'DGCA-compliant drones with RTH failsafe. Insurance covered operations.' },
]

const steps = [
  { step: '01', title: 'Register & Add Field',  desc: 'Create your account and draw your farm boundary on the map.' },
  { step: '02', title: 'Operator Verifies',     desc: 'Our field operator visits, verifies, and uploads the precise flight path.' },
  { step: '03', title: 'Book & Pay Online',     desc: 'Choose date, chemical type, and pay securely via Razorpay.' },
  { step: '04', title: 'Drone Sprays',          desc: 'Autonomous drone executes the mission. Track live on your dashboard.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/drone-icon.svg" alt="FLYTERRA" className="w-8 h-8 object-contain" />
            <span className="font-bold text-xl text-gray-900 tracking-wider">FLYTERRA</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features" className="hover:text-brand-600">Features</a>
            <a href="#how-it-works" className="hover:text-brand-600">How It Works</a>
            <a href="#pricing" className="hover:text-brand-600">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary text-sm">Sign In</Link>
            <Link to="/register" className="btn-primary text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur rounded-full px-4 py-1.5 text-sm mb-6">
            <span className="w-2 h-2 bg-brand-300 rounded-full animate-pulse" />
            Serving farmers across India
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
            Precision Drone Spraying<br />
            <span className="text-brand-300">Delivered to Your Field</span>
          </h1>
          <p className="text-lg md:text-xl text-brand-100 max-w-2xl mx-auto mb-10">
            Book autonomous pesticide spraying from your phone. 10× faster than manual.
            Uniform coverage. Real-time live tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register"
              className="bg-white text-brand-700 font-semibold px-8 py-3 rounded-xl hover:bg-brand-50 transition-colors flex items-center gap-2 justify-center">
              Book a Spray <ChevronRight size={18} />
            </Link>
            <a href="#how-it-works"
              className="border border-white/30 text-white font-semibold px-8 py-3 rounded-xl hover:bg-white/10 transition-colors">
              See How It Works
            </a>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto text-center">
            {[['500+', 'Acres Sprayed'], ['98%', 'On-Time Rate'], ['24/7', 'Support']].map(([val, label]) => (
              <div key={label}>
                <div className="text-3xl font-bold">{val}</div>
                <div className="text-brand-200 text-sm mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Why FLYTERRA?</h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">Everything you need for modern precision agriculture.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
                  <Icon size={24} className="text-brand-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="text-gray-500 mt-3">From signup to first spray in under 24 hours.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-1/4 right-1/4 h-px bg-brand-200" />
            {steps.map(({ step, title, desc }) => (
              <div key={step} className="text-center relative">
                <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="py-24 bg-brand-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Transparent Pricing</h2>
          <p className="text-brand-200 mb-8">Pay per acre. No hidden fees. Price varies by drone model and chemical.</p>
          <div className="inline-block bg-white/10 backdrop-blur rounded-2xl px-12 py-10">
            <h3 className="text-2xl font-bold mb-2">Pay Per Acre</h3>
            <p className="text-brand-200 text-sm mb-6">Price calculated dynamically based on location & drone</p>
            <div className="mt-6 space-y-2 text-sm text-brand-100">
              {['Pesticide / Fertilizer spraying', 'QGC-precise coverage', 'Live tracking included', 'Same-day booking available'].map((f) => (
                <div key={f} className="flex items-center gap-2 justify-center">
                  <CheckCircle size={14} className="text-brand-300" /> {f}
                </div>
              ))}
            </div>
            <Link to="/register" className="mt-8 inline-block bg-white text-brand-700 font-semibold px-8 py-3 rounded-xl hover:bg-brand-50 transition-colors">
              Start Booking
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/drone-icon.svg" alt="FLYTERRA" className="w-7 h-7 object-contain brightness-200" />
            <span className="font-bold text-white tracking-wider">FLYTERRA</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} FLYTERRA. All rights reserved.</p>
          <div className="flex gap-6 text-sm">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
