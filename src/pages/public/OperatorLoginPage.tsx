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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <img src="/drone-icon.svg" alt="FLYTERRA" className="w-10 h-10 object-contain brightness-200" />
            <span className="text-white font-bold text-2xl tracking-wider">FLYTERRA</span>
          </Link>
          <p className="text-blue-200 mt-2 font-medium">Operator Control Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="mb-6 text-center">
            <div className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider mb-2">
              Operator Sign In
            </div>
            <p className="text-sm text-gray-500">Access your deployment dashboard</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <input 
                  {...register('email')} 
                  type="email" 
                  className="input pl-10" 
                  placeholder="operator@flyterra.com" 
                  autoComplete="email" 
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <div className="relative">
                <input 
                  {...register('password')} 
                  type={showPwd ? 'text' : 'password'} 
                  className="input pl-10 pr-10" 
                  placeholder="••••••••" 
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <button 
                  type="button" 
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : 'Access Console'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8">
            Restricted access for authorized personnel only.
          </p>
        </div>
      </div>
    </div>
  )
}
