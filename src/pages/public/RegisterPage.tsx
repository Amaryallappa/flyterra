import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { formatMobileNumber } from '@/utils/format'

const schema = z.object({
  full_name:     z.string().min(2, 'Enter your full name'),
  mobile_number: z.string().length(10, 'Mobile number must be exactly 10 digits'),
  email:         z.string().email('Enter a valid email'),
  password:      z.string().min(8, 'At least 8 characters'),
  confirm:       z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
})

type Form = z.infer<typeof schema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  // Sanitize mobile number: only digits, remove leading 0, max 10 chars
  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatMobileNumber(e.target.value)
    setValue('mobile_number', val, { shouldValidate: true })
  }

  const onSubmit = async (data: Form) => {
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:         data.email,
          password:      data.password,
          full_name:     data.full_name,
          mobile_number: data.mobile_number,
        }),
      })

      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.details || result.error || 'Registration failed')
      }

      toast.success('Account created! Logging you in...')
      
      // Auto-login after successful registration
      await login(data.email, data.password, 'Farmer')
      toast.success('Registration successful! Redirecting to dashboard...')
      navigate('/farmer')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
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
          <p className="text-neutral-500 mt-2 text-sm font-normal">Create your farmer account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl shadow-neutral-200/60 border border-neutral-200/80 p-8 sm:p-9">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Full Name
                </label>
                <input {...register('full_name')} className="input" placeholder="Ramesh Kumar" />
                {errors.full_name && <p className="text-rose-600 text-xs mt-1.5 font-medium">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                  Mobile
                </label>
                <input 
                  {...register('mobile_number')} 
                  onChange={handleMobileChange}
                  className="input" 
                  placeholder="9876543210" 
                />
                {errors.mobile_number && <p className="text-rose-600 text-xs mt-1.5 font-medium">{errors.mobile_number.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Email Address
              </label>
              <input {...register('email')} type="email" className="input" placeholder="ramesh@example.com" autoComplete="email" />
              {errors.email && <p className="text-rose-600 text-xs mt-1.5 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input {...register('password')} type={showPwd ? 'text' : 'password'} className="input pr-10" placeholder="Min 8 chars" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 transition-colors">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-rose-600 text-xs mt-1.5 font-medium">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-600 mb-1.5">
                Confirm Password
              </label>
              <input {...register('confirm')} type={showPwd ? 'text' : 'password'} className="input" placeholder="Re-enter password" />
              {errors.confirm && <p className="text-rose-600 text-xs mt-1.5 font-medium">{errors.confirm.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3 mt-3 text-sm font-medium tracking-wide">
              {isSubmitting ? 'Creating account…' : 'Create Farmer Account'}
            </button>
          </form>

          <p className="text-center text-sm text-neutral-500 mt-6 pt-5 border-t border-neutral-100">
            Already have an account?{' '}
            <Link to="/login" className="text-neutral-900 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
