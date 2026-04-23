import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type Form = z.infer<typeof schema>

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: Form) => {
    try {
      await login(data.email, data.password, 'Admin')
      toast.success('System Administrator Authenticated')
      navigate('/admin')
    } catch (err: any) {
      toast.error(err.message || 'Invalid administrator credentials')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
      <div className="w-full max-w-md relative">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <img src="/drone-icon.svg" alt="FLYTERRA" className="w-12 h-12 object-contain brightness-200" />
            <span className="text-white font-black text-3xl tracking-tighter">FLYTERRA<span className="text-red-600">.</span></span>
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-400 uppercase tracking-[0.2em] text-[10px] font-bold">
            <ShieldAlert size={12} className="text-red-500" />
            Central Command Station
          </div>
        </div>

        <div className="bg-slate-900 rounded-2xl shadow-2xl p-8 border border-slate-800">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Admin Identifier</label>
              <div className="relative">
                <input 
                  {...register('email')} 
                  type="email" 
                  className="w-full bg-slate-800 border-slate-700 text-white rounded-xl py-3 pl-10 focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all" 
                  placeholder="root@flyterra.systems" 
                  autoComplete="email" 
                />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Security Key</label>
              <div className="relative">
                <input 
                  {...register('password')} 
                  type={showPwd ? 'text' : 'password'} 
                  className="w-full bg-slate-800 border-slate-700 text-white rounded-xl py-3 pl-10 pr-10 focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all" 
                  placeholder="••••••••" 
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <button 
                  type="button" 
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>}
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full py-3 px-4 bg-red-700 hover:bg-red-600 text-white font-black rounded-xl shadow-[0_0_20px_rgba(185,28,28,0.2)] transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-widest text-sm"
            >
              {isSubmitting ? 'Authenticating...' : 'Establish Secure Connection'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
             <p className="text-[10px] text-slate-600 uppercase font-bold">
               System monitor: <span className="text-green-500">Active</span> · Secure layer: <span className="text-green-500">Encrypted</span>
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
