import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import '@geoman-io/leaflet-geoman-free'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { fieldsApi } from '@/api/fields'
import toast from 'react-hot-toast'
import { apiErrorMsg } from '@/api/client'
import { ArrowLeft, Info } from 'lucide-react'

const schema = z.object({
  field_name: z.string().min(2, 'Enter a field name'),
  crop_type:  z.string().min(2, 'Enter crop type'),
})
type Form = z.infer<typeof schema>

// Leaflet Geoman polygon drawing component
function PolygonDrawer({ onCoords }: { onCoords: (coords: Array<[number, number]>) => void }) {
  const map = useMap()

  useEffect(() => {
    // Enable PM (Geoman) polygon drawing
    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawText: false,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      rotateMode: false,
    })

    map.on('pm:create', (e) => {
      const layer = e.layer as L.Polygon
      // Remove previous polygons
      map.eachLayer((l) => {
        if (l instanceof L.Polygon && l !== layer) map.removeLayer(l)
      })
      const coords = (layer.getLatLngs()[0] as L.LatLng[]).map(
        (ll): [number, number] => [ll.lat, ll.lng]
      )
      onCoords(coords)
    })

    // Try to center on user location
    navigator.geolocation?.getCurrentPosition(
      (pos) => map.setView([pos.coords.latitude, pos.coords.longitude], 16),
      () => map.setView([20.5937, 78.9629], 6), // Center of India fallback
    )

    return () => { map.pm.removeControls() }
  }, [map, onCoords])

  return null
}

export default function AddFieldPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [boundary, setBoundary] = useState<Array<[number, number]>>([])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  })

  const create = useMutation({
    mutationFn: (payload: Parameters<typeof fieldsApi.create>[0]) => fieldsApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fields'] })
      toast.success('Field added! Pending operator verification.')
      navigate('/farmer/fields')
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMsg(err, 'Failed to add field'))
    },
  })

  const calculateArea = (coords: Array<[number, number]>) => {
    if (coords.length < 3) return 0
    let area = 0
    const R = 6371000 // Earth radius in meters
    const toRad = Math.PI / 180
    
    for (let i = 0; i < coords.length; i++) {
      const p1 = coords[i]
      const p2 = coords[(i + 1) % coords.length]
      // Planar approximation for small agricultural fields
      const x1 = p1[1] * toRad * Math.cos(p1[0] * toRad) * R
      const y1 = p1[0] * toRad * R
      const x2 = p2[1] * toRad * Math.cos(p2[0] * toRad) * R
      const y2 = p2[0] * toRad * R
      area += (x1 * y2 - x2 * y1)
    }
    const areaSqM = Math.abs(area) / 2
    return areaSqM / 4046.86 // Convert to acres
  }

  const onSubmit = (data: Form) => {
    if (boundary.length < 3) {
      toast.error('Please draw your field boundary on the map (minimum 3 points)')
      return
    }

    const area_acres = calculateArea(boundary)
    const boundary_coordinates = boundary.map(([lat, lng]) => ({ lat, lng }))

    create.mutate({ 
      ...data, 
      boundary_coordinates,
      area_acres
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Field</h1>
          <p className="text-gray-500 text-sm">Draw your field boundary on the map, then fill in the details.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Map */}
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2 text-sm text-gray-600">
            <Info size={14} className="text-brand-500" />
            Click "Draw Polygon" (pentagon icon) → click to mark field corners → close to finish
          </div>
          <div style={{ height: 420 }}>
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={6}
              style={{ height: '100%', width: '100%' }}>
              <TileLayer
                url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                attribution="Google Satellite"
              />
              <PolygonDrawer onCoords={setBoundary} />
            </MapContainer>
          </div>
          {boundary.length > 0 && (
            <div className="p-3 bg-green-50 text-green-700 text-sm font-medium text-center">
              ✓ Boundary drawn — {boundary.length} points
            </div>
          )}
        </div>

        {/* Form */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-6">Field Details</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field Name</label>
              <input {...register('field_name')} className="input" placeholder="e.g. North Farm Block A" />
              {errors.field_name && <p className="text-red-500 text-xs mt-1">{errors.field_name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Crop Type</label>
              <input {...register('crop_type')} className="input" placeholder="e.g. Rice, Wheat, Cotton" />
              {errors.crop_type && <p className="text-red-500 text-xs mt-1">{errors.crop_type.message}</p>}
            </div>

            {boundary.length >= 3 && (
              <div className="p-4 bg-brand-50 rounded-xl border border-brand-100">
                <div className="flex justify-between items-center text-brand-900">
                  <span className="text-sm font-medium">Calculated Area:</span>
                  <span className="text-lg font-bold">{calculateArea(boundary).toFixed(2)} Acres</span>
                </div>
              </div>
            )}

            <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-700">
              <p className="font-medium mb-1">Next steps after submission:</p>
              <ol className="list-decimal list-inside space-y-1 text-amber-600">
                <li>Our operator will visit and verify your field</li>
                <li>They'll upload the precise flight mission file</li>
                <li>You'll be notified when verified — then you can book</li>
              </ol>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || create.isPending || boundary.length < 3}
                className="btn-primary flex-1">
                {create.isPending ? 'Submitting…' : 'Submit Field'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
