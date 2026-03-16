import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { fieldsApi, Field } from '@/api/fields'
import { bookingsApi, SlotResponse, CartridgeConfig } from '@/api/bookings'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { apiErrorMsg } from '@/api/client'
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, FlaskConical } from 'lucide-react'
import { format, addDays } from 'date-fns'

// ── Wizard state ──────────────────────────────────────────────────────────────

interface WizardState {
  selectedFields:   number[]
  date:             string
  cartridges:       CartridgeConfig
  selectedSlot:     string | null   // "HH:MM"
  slotResponse:     SlotResponse | null
  drone_id:         number | null
  station_id:       number | null
}

const EMPTY_CART: CartridgeConfig = {
  cartridge_1_ml_per_acre: 0,
  cartridge_2_ml_per_acre: 0,
  cartridge_3_ml_per_acre: 0,
  cartridge_4_ml_per_acre: 0,
  cartridge_5_ml_per_acre: 0,
}

const CART_LABELS = [
  'Cartridge 1', 'Cartridge 2', 'Cartridge 3', 'Cartridge 4', 'Cartridge 5',
] as const

const steps = ['Select Fields', 'Spray Config & Date', 'Time Slot', 'Confirm & Pay']

// ── Main Component ────────────────────────────────────────────────────────────

export default function BookServicePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [state, setState] = useState<WizardState>({
    selectedFields: [],
    date: format(new Date(), 'yyyy-MM-dd'),
    cartridges: EMPTY_CART,
    selectedSlot: null,
    slotResponse: null,
    drone_id: null,
    station_id: null,
  })

  const { data: verifiedFields = [], isLoading } = useQuery({
    queryKey: ['fields-verified'],
    queryFn: fieldsApi.listVerified,
  })

  const { isFetching: loadingSlots } = useQuery({
    queryKey: ['slots', state.selectedFields, state.date],
    queryFn: async () => {
      const res = await bookingsApi.getSlots({
        field_ids: state.selectedFields,
        date: state.date,
      })
      setState((s) => ({
        ...s,
        slotResponse: res,
        selectedSlot: null,
        drone_id: res.drone_id,
        station_id: res.station_id
      }))
      return res
    },
    enabled: step === 2 && state.selectedFields.length > 0 && !!state.date,
  })

  const createBooking = useMutation({
    mutationFn: () => bookingsApi.create({
      field_ids:        state.selectedFields,
      cartridge_config: state.cartridges,
      scheduled_start:  `${state.date}T${state.selectedSlot}:00`,
      drone_id:         state.drone_id!,
      station_id:       state.station_id!,
    }),
    onSuccess: (summary) => {
      if (summary.razorpay) {
        openRazorpay(summary.booking_id, summary.razorpay)
      } else {
        toast('Booking created — Razorpay unavailable. Contact support.', { icon: '⚠️' })
        navigate(`/farmer/bookings/${summary.booking_id}`)
      }
    },
    onError: (err: unknown) => toast.error(apiErrorMsg(err, 'Booking failed')),
  })

  const openRazorpay = (bookingId: number, rz: NonNullable<typeof createBooking.data>['razorpay']) => {
    if (!rz) return
    const options = {
      key:      rz.razorpay_key_id,
      amount:   rz.amount_paise,
      currency: rz.currency,
      name:     'AgriDrone',
      description: 'Drone Spray Service',
      order_id: rz.razorpay_order_id,
      handler: async (response: {
        razorpay_order_id: string
        razorpay_payment_id: string
        razorpay_signature: string
      }) => {
        try {
          await bookingsApi.verifyPayment(bookingId, {
            razorpay_order_id:    response.razorpay_order_id,
            razorpay_payment_id:  response.razorpay_payment_id,
            razorpay_signature:   response.razorpay_signature,
          })
          toast.success('Payment successful! Booking confirmed.')
          navigate(`/farmer/bookings/${bookingId}`)
        } catch {
          toast.error('Payment verification failed. Contact support.')
        }
      },
      prefill: {},
      theme: { color: '#16a34a' },
    }
    // @ts-expect-error Razorpay loaded via CDN
    const rzp = new window.Razorpay(options)
    rzp.open()
  }

  const totalArea = verifiedFields
    .filter((f) => state.selectedFields.includes(f.field_id))
    .reduce((sum, f) => sum + f.area_acres, 0)

  const cartTotal = Object.values(state.cartridges).reduce((s, v) => s + v, 0)

  const next = () => setStep((s) => Math.min(s + 1, 3))
  const prev = () => setStep((s) => Math.max(s - 1, 0))

  const canNext = () => {
    if (step === 0) return state.selectedFields.length > 0
    if (step === 1) return cartTotal > 0 && !!state.date
    if (step === 2) return !!state.selectedSlot
    return false
  }

  const setCart = (key: keyof CartridgeConfig, val: number) =>
    setState((s) => ({ ...s, cartridges: { ...s.cartridges, [key]: val } }))

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Book Spray Service</h1>
        <p className="text-gray-500 text-sm mt-1">Complete the booking in a few steps.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors ${
              i < step ? 'bg-brand-600 text-white' :
              i === step ? 'bg-brand-600 text-white ring-4 ring-brand-100' :
              'bg-gray-100 text-gray-400'
            }`}>
              {i < step ? <CheckCircle2 size={14} /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-brand-700' : 'text-gray-400'}`}>
              {label}
            </span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-gray-200 hidden sm:block" />}
          </div>
        ))}
      </div>

      <div className="card">
        {/* Step 0 — Select Fields */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Select Fields to Spray</h2>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
            ) : verifiedFields.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p>No verified fields yet.</p>
                <p className="text-sm mt-1">Add and get a field verified first.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(() => {
                  const firstSelectedField = verifiedFields.find((f: Field) => state.selectedFields.includes(f.field_id))
                  const filterStationId = firstSelectedField?.station_id
                  
                  const displayFields = filterStationId 
                    ? verifiedFields.filter((f: Field) => f.station_id === filterStationId)
                    : verifiedFields

                  const hiddenCount = verifiedFields.length - displayFields.length

                  return (
                    <>
                      {displayFields.map((f: Field) => {
                        const selected = state.selectedFields.includes(f.field_id)
                        return (
                          <label key={f.field_id}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                              selected ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-brand-200'
                            }`}>
                            <input type="checkbox" checked={selected}
                              onChange={(e) => {
                                setState((s) => ({
                                  ...s,
                                  selectedFields: e.target.checked
                                    ? [...s.selectedFields, f.field_id]
                                    : s.selectedFields.filter((id) => id !== f.field_id),
                                }))
                              }}
                              className="accent-brand-600 w-4 h-4" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{f.field_name}</p>
                              <p className="text-sm text-gray-500">{f.crop_type} · {f.area_acres.toFixed(2)} acres</p>
                            </div>
                          </label>
                        )
                      })}
                      {hiddenCount > 0 && (
                        <p className="text-[10px] text-gray-400 text-center italic py-2">
                          {hiddenCount} other fields hidden (must belong to same station)
                        </p>
                      )}
                    </>
                  )
                })()}
              </div>
            )}
            {state.selectedFields.length > 0 && (
              <div className="text-sm text-brand-700 font-medium bg-brand-50 px-4 py-2 rounded-lg">
                Total area: {totalArea.toFixed(2)} acres
              </div>
            )}
          </div>
        )}

        {/* Step 1 — Spray Config & Date */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-semibold text-gray-900">Spray Configuration & Date</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date</label>
              <input
                type="date"
                value={state.date}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setState((s) => ({ ...s, date: e.target.value, selectedSlot: null }))}
                className="input" />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <FlaskConical size={16} className="text-brand-600" />
                <p className="text-sm font-medium text-gray-700">Cartridge Mix (ml per acre)</p>
              </div>
              <p className="text-xs text-gray-400 mb-3">Configure at least one cartridge. Set 0 for unused slots.</p>
              <div className="space-y-3">
                {CART_LABELS.map((label, i) => {
                  const key = `cartridge_${i + 1}_ml_per_acre` as keyof CartridgeConfig
                  return (
                    <div key={key} className="flex items-center gap-4">
                      <span className="text-sm text-gray-600 w-28 flex-shrink-0">{label}</span>
                      <input
                        type="number"
                        min={0}
                        max={5000}
                        value={state.cartridges[key] || ''}
                        placeholder="0"
                        onChange={(e) => setCart(key, Math.max(0, parseInt(e.target.value) || 0))}
                        className="input w-32" />
                      <span className="text-xs text-gray-400">ml/acre</span>
                    </div>
                  )
                })}
              </div>
              {cartTotal === 0 && (
                <p className="text-red-500 text-xs mt-2">Set at least one cartridge &gt; 0 ml/acre</p>
              )}
              {cartTotal > 0 && (
                <p className="text-brand-700 text-xs mt-2 bg-brand-50 px-3 py-1.5 rounded-lg">
                  Total spray rate: {cartTotal} ml/acre · {(cartTotal * totalArea / 1000).toFixed(1)} L for {totalArea.toFixed(2)} acres
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Time slot */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold text-gray-900">
                Available Slots — {format(new Date(state.date), 'MMMM d, yyyy')}
              </h2>
              {state.slotResponse && (
                <span className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-lg">
                  Est. duration: {state.slotResponse.t_req_breakdown.total_hours}
                </span>
              )}
            </div>
            {loadingSlots ? (
              <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-brand-500" /></div>
            ) : !state.slotResponse || state.slotResponse.available_slots.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No available slots for this date. Try another day.</div>
            ) : (
              <>
                <div className="grid sm:grid-cols-3 gap-3">
                  {state.slotResponse.available_slots.map((slot) => {
                    const active = state.selectedSlot === slot
                    // Simple heuristic: if job > 2h and slot is late, it likely spans multiple days
                    const isMultiDay = state.slotResponse!.t_req_breakdown.total_mins > 120
                    
                    return (
                      <button key={slot}
                        type="button"
                        onClick={() => setState((s) => ({ ...s, selectedSlot: slot }))}
                        className={`p-3 rounded-xl border-2 text-left transition-colors ${
                          active ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-brand-200'
                        }`}>
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-gray-900">{slot}</p>
                          {isMultiDay && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-tight">Multi-day</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          ~{state.slotResponse!.t_req_breakdown.total_hours}
                        </p>
                      </button>
                    )
                  })}
                </div>
                {state.slotResponse.t_req_breakdown && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 space-y-1">
                    {[
                      ['Spray time', `${state.slotResponse.t_req_breakdown.spray_time_mins.toFixed(0)} min`],
                      ['Setup', `${state.slotResponse.t_req_breakdown.setup_time_mins.toFixed(0)} min`],
                      ['Refill time', `${state.slotResponse.t_req_breakdown.refill_time_mins.toFixed(0)} min`],
                      ['Refills required', `${state.slotResponse.t_req_breakdown.n_refills} times`],
                    ].map(([l, v]) => (
                      <div key={l} className="flex justify-between">
                        <span>{l}</span><span className="font-medium text-gray-700">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 3 — Confirm & Pay */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-semibold text-gray-900">Confirm Booking</h2>
            <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm">
              {[
                ['Fields', verifiedFields
                  .filter((f: Field) => state.selectedFields.includes(f.field_id))
                  .map((f: Field) => f.field_name).join(', ')],
                ['Total Area', `${totalArea.toFixed(2)} acres`],
                ['Date', format(new Date(state.date), 'MMMM d, yyyy')],
                ['Time', state.selectedSlot ?? '—'],
                ['Est. Duration', state.slotResponse?.t_req_breakdown.total_hours ?? '—'],
                ['Per Acre Price', `₹${state.slotResponse?.t_req_breakdown.price_per_acre ?? '—'}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900 text-right max-w-xs">{value}</span>
                </div>
              ))}
              
              {/* Cartridge Details */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Cartridge Configuration</p>
                <div className="space-y-2">
                  {CART_LABELS.map((label, i) => {
                    const key = `cartridge_${i + 1}_ml_per_acre` as keyof CartridgeConfig
                    const rate = state.cartridges[key]
                    if (!rate) return null
                    
                    const totalMl = rate * totalArea
                    const totalDisplay = totalMl >= 1000 
                      ? `${(totalMl / 1000).toFixed(2)} L` 
                      : `${totalMl.toFixed(0)} ml`
                      
                    return (
                      <div key={label} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100">
                        <span className="text-gray-600 font-medium">{label}</span>
                        <div className="text-right">
                          <p className="text-gray-900 font-bold">{totalDisplay}</p>
                          <p className="text-[10px] text-gray-400">{rate} ml/acre</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 mt-2 border-t-2 border-brand-100 flex justify-between items-center">
                <span className="font-bold text-gray-900 text-lg">Total Amount</span>
                <span className="font-black text-brand-600 text-2xl">₹{state.slotResponse?.total_cost ?? '—'}</span>
              </div>
            </div>

            <div className="bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-lg">
              You will be redirected to Razorpay to complete payment after clicking Pay Now.
            </div>

            <button
              type="button"
              onClick={() => createBooking.mutate()}
              disabled={createBooking.isPending}
              className="btn-primary w-full py-3 text-base">
              {createBooking.isPending ? 'Creating booking…' : 'Pay Now →'}
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          <button onClick={prev} disabled={step === 0} className="btn-secondary flex items-center gap-2">
            <ChevronLeft size={16} /> Back
          </button>
          {step < 3 && (
            <button onClick={next} disabled={!canNext()} className="btn-primary flex items-center gap-2">
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
