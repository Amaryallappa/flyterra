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

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    try {
      await login(data.email, data.password, 'Farmer')
      toast.success('Welcome back!')
      navigate('/farmer')
    } catch (err: any) {
      toast.error(err.message || 'Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 selection:bg-neutral-900 selection:text-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3.5 group">
            <img
              src="/hecterra logo.svg"
              alt="HecTerra"
              className="h-10 sm:h-11 w-auto object-contain group-hover:scale-105 transition-transform"
            />
            <span className="text-neutral-900 font-bold text-2xl tracking-wider">
              HecTerra
            </span>
          </Link>
          <p className="text-neutral-500 mt-2 text-sm font-normal">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-neutral-200/60 border border-neutral-200/80 p-8 sm:p-9">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input 
                  {...register('email')} 
                  type="email" 
                  className="input pl-10" 
                  placeholder="farmer@hecterra.in" 
                  autoComplete="email" 
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" size={17} />
              </div>
              {errors.email && <p className="text-rose-600 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Password
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
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-neutral-100 flex flex-col gap-3">
            <p className="text-center text-sm text-neutral-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-neutral-900 font-semibold hover:underline">
                Register now
              </Link>
            </p>

            <div className="flex items-center justify-center gap-4 text-xs text-neutral-400 pt-2 border-t border-neutral-100">
              <Link to="/operator/login" className="hover:text-neutral-700 transition-colors">
                Operator Portal
              </Link>
              <span>•</span>
              <Link to="/admin/login" className="hover:text-neutral-700 transition-colors">
                Admin Console
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
