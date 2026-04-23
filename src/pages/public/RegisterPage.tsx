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
      
      // Auto-login
      await login(data.email, data.password)
      navigate('/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/drone-icon.svg" alt="FLYTERRA" className="w-10 h-10 object-contain brightness-200" />
            <span className="text-white font-bold text-2xl tracking-wider">FLYTERRA</span>
          </Link>
          <p className="text-brand-200 mt-2">Create your farmer account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input {...register('full_name')} className="input" placeholder="Ramesh Kumar" />
                {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                <input 
                  {...register('mobile_number')} 
                  onChange={handleMobileChange}
                  className="input" 
                  placeholder="9876543210" 
                />
                {errors.mobile_number && <p className="text-red-500 text-xs mt-1">{errors.mobile_number.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input {...register('email')} type="email" className="input" placeholder="ramesh@example.com" autoComplete="email" />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input {...register('password')} type={showPwd ? 'text' : 'password'} className="input pr-10" placeholder="Min 8 chars" />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input {...register('confirm')} type={showPwd ? 'text' : 'password'} className="input" placeholder="Re-enter password" />
              {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5 mt-2">
              {isSubmitting ? 'Creating account…' : 'Create Farmer Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
