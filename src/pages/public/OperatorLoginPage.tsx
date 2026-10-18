import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type Form = z.infer<typeof schema>

export default function OperatorLoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    try {
      await login(data.email, data.password, 'Operator')
      toast.success('Operator Access Granted')
      navigate('/operator')
    } catch (err: any) {
      toast.error(err.message || 'Invalid operator credentials')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 selection:bg-neutral-900 selection:text-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3.5 group">
            <img
              src="/hecterra logo.svg"
              alt="HECTERRA"
              className="h-10 sm:h-11 w-auto object-contain group-hover:scale-105 transition-transform"
            />
            <span className="text-neutral-900 font-bold text-2xl tracking-wider">
              HECTERRA
            </span>
          </Link>
          <p className="text-neutral-500 mt-2 font-normal text-sm">Operator Flight Control Portal</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-neutral-200/60 p-8 sm:p-9 border border-neutral-200/80">
          <div className="mb-6 text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-semibold uppercase tracking-wider mb-2 border border-neutral-200">
              Pilot & Swarm Access
            </div>
            <p className="text-xs text-neutral-500">Sign in to control and verify flight missions</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Operator Email
              </label>
              <div className="relative">
                <input 
                  {...register('email')} 
                  type="email" 
                  className="input pl-10" 
                  placeholder="operator@hecterra.in" 
                  autoComplete="email" 
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
              </div>
              {errors.email && <p className="text-rose-600 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <input 
                  {...register('password')} 
                  type={showPwd ? 'text' : 'password'} 
                  className="input pl-10 pr-10" 
                  placeholder="••••••••" 
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
                <button 
                  type="button" 
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-rose-600 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="btn-primary w-full py-3 mt-3 text-sm font-medium tracking-wide"
            >
              {isSubmitting ? 'Verifying...' : 'Access Mission Console'}
            </button>
          </form>

          <div className="mt-8 pt-5 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400">
            <Link to="/login" className="hover:text-neutral-700 transition-colors">
              ← Farmer Sign In
            </Link>
            <Link to="/admin/login" className="hover:text-neutral-700 transition-colors">
              Admin Console →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
