import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { Eye, EyeOff, KeyRound, CheckCircle2, Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { apiErrorMsg } from '@/api/client'

interface RazorpaySettings {
  key_id: string
  key_id_set: boolean
  key_secret_set: boolean
  updated_at: string | null
}

export default function SettingsPage() {
  const qc = useQueryClient()
  const [keyId, setKeyId] = useState('')
  const [keySecret, setKeySecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)

  const { data, isLoading } = useQuery<RazorpaySettings>({
    queryKey: ['admin-razorpay-settings'],
    queryFn: adminApi.getRazorpaySettings,
  })

  useEffect(() => {
    if (data) setKeyId(data.key_id || '')
  }, [data])

  const save = useMutation({
    mutationFn: () => {
      const payload: { key_id?: string; key_secret?: string } = {}
      if (keyId.trim())     payload.key_id     = keyId.trim()
      if (keySecret.trim()) payload.key_secret = keySecret.trim()
      return adminApi.updateRazorpaySettings(payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-razorpay-settings'] })
      setKeySecret('')
      toast.success('Razorpay keys saved')
    },
    onError: (err: unknown) => toast.error(apiErrorMsg(err, 'Failed to save')),
  })

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString() : '—'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Manage runtime configuration — changes take effect immediately without restart.</p>
      </div>

      {/* Razorpay card */}
      <div className="card space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
            <KeyRound size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Razorpay Payment Gateway</h2>
            <p className="text-xs text-gray-500">Keys are stored encrypted in the database and override any .env values.</p>
          </div>
        </div>

        {/* Status badges */}
        {!isLoading && data && (
          <div className="flex gap-3 flex-wrap">
            <span className={`badge flex items-center gap-1.5 ${data.key_id_set ? 'badge-green' : 'badge-yellow'}`}>
              <CheckCircle2 size={11} />
              Key ID: {data.key_id_set ? 'Configured' : 'Not set'}
            </span>
            <span className={`badge flex items-center gap-1.5 ${data.key_secret_set ? 'badge-green' : 'badge-yellow'}`}>
              <CheckCircle2 size={11} />
              Key Secret: {data.key_secret_set ? 'Configured' : 'Not set'}
            </span>
            {data.updated_at && (
              <span className="badge badge-blue text-xs">
                Last updated: {fmt(data.updated_at)}
              </span>
            )}
          </div>
        )}

        <div className="space-y-4">
          {/* Key ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key ID <span className="text-gray-400 font-normal">(rzp_live_… or rzp_test_…)</span>
            </label>
            <input
              className="input font-mono"
              placeholder={isLoading ? 'Loading…' : 'rzp_live_xxxxxxxxxxxxxxxx'}
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
            />
          </div>

          {/* Key Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Secret
              {data?.key_secret_set && (
                <span className="ml-2 text-xs text-green-600 font-normal">● currently set — enter new value to replace</span>
              )}
            </label>
            <div className="relative">
              <input
                className="input font-mono pr-10"
                type={showSecret ? 'text' : 'password'}
                placeholder={data?.key_secret_set ? '••••••••••••••••••••••••' : 'Enter key secret'}
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">The secret is write-only and never returned by the API.</p>
          </div>

          <button
            onClick={() => save.mutate()}
            disabled={save.isPending || (!keyId.trim() && !keySecret.trim())}
            className="btn-primary flex items-center gap-2"
          >
            {save.isPending
              ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
              : <><Save size={15} /> Save Keys</>}
          </button>
        </div>

        {/* Help */}
        <div className="bg-gray-50 rounded-lg p-4 text-xs text-gray-500 space-y-1 border border-gray-100">
          <p className="font-medium text-gray-700">Where to find your keys</p>
          <p>1. Log in to your Razorpay Dashboard → Settings → API Keys</p>
          <p>2. Generate keys for Live (production) or Test (sandbox) mode</p>
          <p>3. Use <span className="font-mono bg-gray-100 px-1 rounded">rzp_test_</span> keys for development, <span className="font-mono bg-gray-100 px-1 rounded">rzp_live_</span> for production</p>
        </div>
      </div>
    </div>
  )
}
