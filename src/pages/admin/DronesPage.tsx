import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/api/admin'
import { useForm } from 'react-hook-form'
import { Plus, Trash2, Edit2, Loader2, X, Radio, Battery, Gauge, Mountain, Wind,
         Navigation, Satellite, Wifi, Activity, MapPin, ChevronUp, ChevronDown,
         AlertTriangle, Video, VideoOff, Maximize2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSocket } from '@/hooks/useSocket'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'

interface Drone {
  drone_id: number; drone_serial_no: string; status: string
  station_id: number | null; operation_type: string
  price_per_acre: number; minutes_per_acre: number; active_date: string
  drone_companion_url: string | null
  drone_live_video_url: string | null
  base_setup_time_mins: number
  max_acres_per_tank: number
  station_refill_time_mins: number
  daily_start_time: string
  daily_end_time: string
}

function resolveVideoUrl(drone: Drone): string | null {
  if (drone.drone_live_video_url) return drone.drone_live_video_url
  if (drone.drone_companion_url) return drone.drone_companion_url.replace(/\/$/, '') + '/drone/index.m3u8'
  return null
}

interface CompanionFrame {
  drone_id: number; booking_id?: number; station_id?: number
  timestamp: string; source?: string
  // Position
  lat?: number; lng?: number; alt_rel?: number; alt_msl?: number
  // Motion
  groundspeed?: number; airspeed?: number; heading?: number; climb?: number; throttle?: number
  // Attitude
  roll?: number; pitch?: number; yaw?: number
  // Battery
  battery_voltage?: number; battery_current?: number; battery_remaining?: number
  cell_voltages?: number[]
  // GPS
  gps_sats?: number; gps_fix?: number; gps_hdop?: number
  // System
  armed?: boolean; flight_mode?: string
  // Radio
  rssi?: number; remrssi?: number
  // Nav
  wp_seq?: number; wp_dist?: number
  // Legacy fields from station
  altitude_meters?: number; speed_mps?: number; heading_deg?: number
  battery_percent?: number; phase?: string
}

// ── Drone icon for map ─────────────────────────────────────────────────────────
function makeDroneIcon(heading: number) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:26px;height:26px;border-radius:50%;
      background:rgba(74,158,255,0.95);border:2px solid #fff;
      box-shadow:0 0 0 5px rgba(74,158,255,0.25);
      display:flex;align-items:center;justify-content:center;
      transform:rotate(${heading}deg);transition:transform 0.3s;
    ">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
        <polygon points="12,2 22,22 12,17 2,22"/>
      </svg>
    </div>`,
    iconSize: [26, 26], iconAnchor: [13, 13],
  })
}

// Recenter map when drone moves
function MapAutoCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], map.getZoom()) }, [lat, lng])
  return null
}

// ── Artificial Horizon ─────────────────────────────────────────────────────────
function ArtificialHorizon({ roll, pitch }: { roll: number; pitch: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    const w = c.width, h = c.height, cx = w / 2, cy = h / 2, r = w / 2 - 4

    ctx.clearRect(0, 0, w, h)
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()

    // Roll + pitch transform
    ctx.translate(cx, cy)
    ctx.rotate((roll * Math.PI) / 180)
    const pitchPx = pitch * (r / 45)

    // Sky
    ctx.fillStyle = '#1e4a8a'
    ctx.fillRect(-r, -r * 2 + pitchPx, r * 2, r * 2)
    // Ground
    ctx.fillStyle = '#7a5e0a'
    ctx.fillRect(-r, pitchPx, r * 2, r * 2)
    // Horizon line
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(-r, pitchPx); ctx.lineTo(r, pitchPx); ctx.stroke()

    // Pitch ladder (every 10°)
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = '8px monospace'
    ctx.lineWidth = 1
    for (let p = -40; p <= 40; p += 10) {
      if (p === 0) continue
      const y = pitchPx - p * (r / 45)
      const len = p % 20 === 0 ? 22 : 12
      ctx.beginPath(); ctx.moveTo(-len, y); ctx.lineTo(len, y); ctx.stroke()
      if (p % 20 === 0) {
        ctx.fillText(String(Math.abs(p)), len + 3, y + 3)
        ctx.fillText(String(Math.abs(p)), -len - 14, y + 3)
      }
    }

    ctx.restore()

    // Fixed aircraft symbol
    ctx.strokeStyle = '#f5c542'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(cx - 30, cy); ctx.lineTo(cx - 10, cy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx + 10, cy); ctx.lineTo(cx + 30, cy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4); ctx.stroke()

    // Roll arc
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, r - 8, -Math.PI * 0.75, -Math.PI * 0.25)
    ctx.stroke()
    // Roll indicator
    const rollRad = (roll * Math.PI) / 180
    const tickR = r - 8
    ctx.strokeStyle = '#f5c542'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx + tickR * Math.sin(-rollRad) * 0.9, cy - tickR * Math.cos(-rollRad) * 0.9)
    ctx.lineTo(cx + tickR * Math.sin(-rollRad), cy - tickR * Math.cos(-rollRad))
    ctx.stroke()

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  }, [roll, pitch])

  return (
    <canvas
      ref={canvasRef}
      width={160} height={160}
      style={{ borderRadius: '50%', display: 'block' }}
    />
  )
}

// ── Battery cells display ──────────────────────────────────────────────────────
function BatteryCells({ cells }: { cells: number[] }) {
  const minV = 3.3, maxV = 4.2
  return (
    <div className="flex gap-1 flex-wrap">
      {cells.map((v, i) => {
        const pct = Math.max(0, Math.min(100, ((v - minV) / (maxV - minV)) * 100))
        const color = pct > 50 ? '#3dd68c' : pct > 20 ? '#f5c542' : '#ff5757'
        return (
          <div key={i} title={`Cell ${i + 1}: ${v.toFixed(3)}V`}
            style={{
              width: 28, height: 44, background: '#1e2635',
              border: `1px solid #2e3a50`, borderRadius: 3,
              display: 'flex', flexDirection: 'column',
              justifyContent: 'flex-end', overflow: 'hidden', position: 'relative',
            }}>
            <div style={{ height: `${pct}%`, background: color, transition: 'height 0.4s' }} />
            <div style={{
              position: 'absolute', bottom: 2, left: 0, right: 0,
              textAlign: 'center', fontSize: 7, color: '#dde3ef', fontFamily: 'monospace',
            }}>{v.toFixed(2)}</div>
          </div>
        )
      })}
    </div>
  )
}

// ── GPS fix label ──────────────────────────────────────────────────────────────
function gpsFix(f?: number) {
  return ['–', 'NoFix', '2D', '3D', 'DGPS', 'RTK±', 'RTK'][f ?? 0] ?? '–'
}

// Convert hex colour to "r,g,b" for rgba() in inline styles
function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

// ── Full telemetry modal ───────────────────────────────────────────────────────
function DroneLiveModal({ drone, onClose }: { drone: Drone; onClose: () => void }) {
  const [telem, setTelem] = useState<CompanionFrame | null>(null)
  const [track, setTrack] = useState<[number, number][]>([])
  const [ctrlOpen, setCtrlOpen] = useState(true)
  const [takeoffAlt, setTakeoffAlt] = useState('10')
  const [targetSpeed, setTargetSpeed] = useState('5')
  const [targetAlt, setTargetAlt] = useState('10')
  const [confirmCmd, setConfirmCmd] = useState<null | { label: string; fn: () => void }>(null)
  const [videoError, setVideoError] = useState(false)
  const [videoFullscreen, setVideoFullscreen] = useState(false)
  const { on } = useSocket(drone.drone_companion_url || undefined)
  const videoRef = useRef<HTMLVideoElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const videoPanelRef = useRef<HTMLDivElement>(null)

  // Derive stream type from URL
  const videoUrl = resolveVideoUrl(drone)
  const streamType = !videoUrl ? null
    : /mjpe?g|action=stream|stream\.cgi/i.test(videoUrl) ? 'mjpeg'
    : videoUrl.includes('.m3u8') ? 'hls'
    : /whep/i.test(videoUrl) ? 'whep'
    : 'native'

  const sendCmd = useMutation({
    mutationFn: ({ cmd, params }: { cmd: string; params?: { param1?: number; mode?: string } }) =>
      adminApi.sendDroneCommand(drone.drone_id, cmd, params),
    onSuccess: (_data, vars) => toast.success(`Command sent: ${vars.cmd}`),
    onError: () => toast.error('Command failed'),
  })

  function dispatch(cmd: string, params?: { param1?: number; mode?: string }) {
    sendCmd.mutate({ cmd, params })
  }

  function confirm(label: string, fn: () => void) {
    setConfirmCmd({ label, fn })
  }

  useEffect(() => {
    const off = on('drone_telemetry', (data: unknown) => {
      const d = data as CompanionFrame
      if (d.drone_id === drone.drone_id) {
        setTelem(d)
        const lat = d.lat ?? undefined
        const lng = d.lng ?? undefined
        if (lat !== undefined && lng !== undefined) {
          setTrack((prev) => {
            const next: [number, number][] = [...prev, [lat, lng]]
            return next.length > 300 ? next.slice(-300) : next
          })
        }
      }
    })
    return off
  }, [on, drone.drone_id])

  // Video stream setup
  useEffect(() => {
    if (!videoUrl) return
    setVideoError(false)
    let hlsInstance: import('hls.js').default | null = null

    if (streamType === 'hls') {
      import('hls.js').then(({ default: Hls }) => {
        if (!videoRef.current) return
        if (Hls.isSupported()) {
          hlsInstance = new Hls({ lowLatencyMode: true, backBufferLength: 4 })
          hlsInstance.loadSource(videoUrl)
          hlsInstance.attachMedia(videoRef.current)
          hlsInstance.on(Hls.Events.ERROR, (_e, data) => {
            if (data.fatal) setVideoError(true)
          })
        } else {
          videoRef.current.src = videoUrl
        }
      }).catch(() => { if (videoRef.current) videoRef.current.src = videoUrl })
    } else if (streamType === 'native' || streamType === 'whep') {
      if (videoRef.current) videoRef.current.src = videoUrl
    }
    // MJPEG: handled by <img src={videoUrl}> directly in JSX

    return () => { hlsInstance?.destroy() }
  }, [videoUrl, streamType])

  // Fullscreen handler
  function toggleVideoFullscreen() {
    const el = videoPanelRef.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setVideoFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen().then(() => setVideoFullscreen(false)).catch(() => {})
    }
  }

  useEffect(() => {
    const handler = () => setVideoFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  // Normalise telemetry fields (companion vs station)
  const alt    = telem?.alt_rel     ?? telem?.altitude_meters
  const spd    = telem?.groundspeed ?? telem?.speed_mps
  const hdg    = telem?.heading     ?? telem?.heading_deg
  const bat    = telem?.battery_remaining ?? telem?.battery_percent
  const armed  = telem?.armed
  const mode   = telem?.flight_mode ?? telem?.phase ?? '–'
  const lat    = telem?.lat
  const lng    = telem?.lng
  const center: [number, number] = lat && lng ? [lat, lng] : [20.5937, 78.9629]

  const batColor = bat == null ? '#7585a0' : bat > 50 ? '#3dd68c' : bat > 20 ? '#f5c542' : '#ff5757'

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2">
      <div style={{ background: '#0b0e14', color: '#dde3ef', borderRadius: 12,
                    width: '100%', maxWidth: 1100, maxHeight: '95vh',
                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                    border: '1px solid #252d3d', position: 'relative' }}>

        {/* ── Top bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                      background: '#111621', borderBottom: '1px solid #252d3d', flexShrink: 0 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#4a9eff', letterSpacing: 1 }}>
            DRONE<span style={{ color: '#dde3ef' }}>GCS</span>
          </span>
          <span style={{ fontSize: 12, color: '#7585a0', marginLeft: 4 }}>
            #{drone.drone_id} — {drone.drone_serial_no}
          </span>

          {/* Status pills */}
          <div style={{ display: 'flex', gap: 6, marginLeft: 'auto', alignItems: 'center' }}>
            {telem ? (
              <>
                <span style={{ display:'inline-flex',alignItems:'center',gap:4,fontSize:11,
                  padding:'2px 8px',borderRadius:20,fontWeight:600,
                  background: armed ? 'rgba(61,214,140,.12)' : 'rgba(255,87,87,.12)',
                  color: armed ? '#3dd68c' : '#ff5757',
                  border: `1px solid ${armed ? 'rgba(61,214,140,.3)' : 'rgba(255,87,87,.3)'}` }}>
                  <span style={{ width:6,height:6,borderRadius:'50%',
                    background: armed ? '#3dd68c' : '#ff5757', display:'inline-block' }} />
                  {armed ? 'ARMED' : 'DISARMED'}
                </span>
                <span style={{ fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:600,
                  background:'rgba(74,158,255,.12)',color:'#4a9eff',
                  border:'1px solid rgba(74,158,255,.3)' }}>
                  {mode}
                </span>
                <span style={{ fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:600,
                  background:'rgba(61,214,140,.12)',color:'#3dd68c',
                  border:'1px solid rgba(61,214,140,.3)' }}>
                  <span style={{ width:6,height:6,borderRadius:'50%',background:'#3dd68c',
                    display:'inline-block',marginRight:4,
                    animation:'pulse 1s infinite' }} />
                  Live
                </span>
              </>
            ) : (
              <span style={{ fontSize:11,padding:'2px 8px',borderRadius:20,fontWeight:600,
                background:'rgba(255,255,255,.06)',color:'#7585a0',
                border:'1px solid #252d3d' }}>
                Waiting for telemetry…
              </span>
            )}
            <button onClick={onClose}
              style={{ background:'none',border:'none',color:'#7585a0',cursor:'pointer',
                       fontSize:18,lineHeight:1,marginLeft:4 }}>✕</button>
          </div>
        </div>

        {/* ── Telemetry strip ── */}
        <div style={{ display:'flex',alignItems:'stretch',gap:1,background:'#252d3d',
                      borderBottom:'1px solid #252d3d',flexShrink:0 }}>
          {[
            { lbl:'Alt (rel)',  val: alt   != null ? `${alt.toFixed(1)}` : '–',  unit:'m' },
            { lbl:'Alt MSL',    val: telem?.alt_msl != null ? `${telem.alt_msl.toFixed(1)}` : '–', unit:'m' },
            { lbl:'Gnd Speed',  val: spd   != null ? `${spd.toFixed(1)}` : '–',  unit:'m/s' },
            { lbl:'Climb',      val: telem?.climb != null ? `${telem.climb.toFixed(1)}` : '–', unit:'m/s' },
            { lbl:'Heading',    val: hdg   != null ? `${hdg.toFixed(0)}` : '–',  unit:'°' },
            { lbl:'Throttle',   val: telem?.throttle != null ? `${telem.throttle}` : '–', unit:'%' },
            { lbl:'RSSI',       val: telem?.rssi != null ? String(telem.rssi) : '–', unit:'' },
            { lbl:'GPS Sats',   val: telem?.gps_sats != null ? String(telem.gps_sats) : '–', unit:'' },
            { lbl:'WP / Dist',  val: telem?.wp_dist != null ? `${telem.wp_dist.toFixed(0)}` : '–', unit:'m' },
          ].map(({ lbl, val, unit }) => (
            <div key={lbl} style={{ flex:1,display:'flex',flexDirection:'column',
              justifyContent:'center',padding:'4px 10px',background:'#111621',minWidth:70 }}>
              <div style={{ fontSize:9,color:'#7585a0',textTransform:'uppercase',
                            letterSpacing:'.7px',marginBottom:3 }}>{lbl}</div>
              <div style={{ fontSize:17,fontWeight:700,fontFamily:'monospace',color:'#dde3ef' }}>
                {val}<span style={{ fontSize:10,color:'#7585a0',marginLeft:2 }}>{unit}</span>
              </div>
            </div>
          ))}
          {/* Battery cell */}
          <div style={{ flex:1.5,display:'flex',flexDirection:'column',justifyContent:'center',
                        padding:'4px 10px',background:'#111621',minWidth:100 }}>
            <div style={{ display:'flex',justifyContent:'space-between',
                          fontSize:9,color:'#7585a0',textTransform:'uppercase',
                          letterSpacing:'.7px',marginBottom:3 }}>
              <span>Battery</span>
              <span style={{ fontWeight:700,color:batColor }}>{bat != null ? `${bat}%` : '–'}</span>
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:6 }}>
              <div style={{ flex:1,height:5,background:'#1e2635',borderRadius:3,overflow:'hidden' }}>
                <div style={{ height:'100%',borderRadius:3,background:batColor,
                              width:`${bat ?? 0}%`,transition:'width .6s' }} />
              </div>
              <span style={{ fontSize:10,color:'#7585a0',minWidth:30,fontFamily:'monospace' }}>
                {telem?.battery_voltage?.toFixed(1) ?? '–'}V
              </span>
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ display:'flex',flex:1,overflow:'hidden',gap:0 }}>

          {/* LEFT: Attitude + GPS detail */}
          <div style={{ width:200,flexShrink:0,background:'#111621',
                        borderRight:'1px solid #252d3d',overflowY:'auto',
                        display:'flex',flexDirection:'column',gap:0 }}>

            {/* Artificial horizon */}
            <div style={{ padding:12,borderBottom:'1px solid #252d3d' }}>
              <div style={{ fontSize:9,fontWeight:700,color:'#7585a0',
                            textTransform:'uppercase',letterSpacing:'.8px',marginBottom:8 }}>
                Attitude
              </div>
              <div style={{ display:'flex',justifyContent:'center' }}>
                <ArtificialHorizon roll={telem?.roll ?? 0} pitch={telem?.pitch ?? 0} />
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',
                            fontSize:10,fontFamily:'monospace',color:'#7585a0',
                            marginTop:6,padding:'0 2px' }}>
                <span>R:{(telem?.roll  ?? 0).toFixed(1)}°</span>
                <span>P:{(telem?.pitch ?? 0).toFixed(1)}°</span>
                <span>Y:{(telem?.yaw   ?? 0).toFixed(1)}°</span>
              </div>
            </div>

            {/* GPS detail */}
            <div style={{ padding:12,borderBottom:'1px solid #252d3d' }}>
              <div style={{ fontSize:9,fontWeight:700,color:'#7585a0',
                            textTransform:'uppercase',letterSpacing:'.8px',marginBottom:8 }}>
                GPS Detail
              </div>
              {[
                ['Lat',  telem?.lat?.toFixed(7)  ?? '–'],
                ['Lon',  telem?.lng?.toFixed(7)  ?? '–'],
                ['Fix',  gpsFix(telem?.gps_fix)],
                ['HDOP', telem?.gps_hdop?.toFixed(2) ?? '–'],
                ['Sats', String(telem?.gps_sats ?? '–')],
                ['Curr', telem?.battery_current != null ? `${telem.battery_current.toFixed(1)} A` : '–'],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ display:'flex',justifyContent:'space-between',
                                        fontSize:11,fontFamily:'monospace',
                                        lineHeight:2,color:'#7585a0' }}>
                  <span>{lbl}:</span>
                  <span style={{ color:'#dde3ef' }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Battery cells */}
            {telem?.cell_voltages && telem.cell_voltages.length > 0 && (
              <div style={{ padding:12 }}>
                <div style={{ fontSize:9,fontWeight:700,color:'#7585a0',
                              textTransform:'uppercase',letterSpacing:'.8px',marginBottom:8 }}>
                  Cell Voltages
                </div>
                <BatteryCells cells={telem.cell_voltages} />
              </div>
            )}
          </div>

          {/* CENTER: Map */}
          <div style={{ flex:1,position:'relative',overflow:'hidden' }}>
            <MapContainer
              center={center}
              zoom={17}
              style={{ width:'100%',height:'100%' }}
              zoomControl={false}
            >
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution="Esri Satellite"
                maxZoom={21}
              />
              {track.length > 1 && (
                <Polyline positions={track} color="#4a9eff" weight={2} opacity={0.7} />
              )}
              {lat && lng && (
                <>
                  <Marker position={[lat, lng]} icon={makeDroneIcon(hdg ?? 0)} />
                  <MapAutoCenter lat={lat} lng={lng} />
                </>
              )}
            </MapContainer>
            {/* WP info overlay */}
            {telem?.wp_seq != null && (
              <div style={{ position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',
                background:'rgba(11,14,20,.85)',border:'1px solid #2e3a50',
                borderRadius:8,padding:'5px 14px',fontSize:11,color:'#7585a0',
                zIndex:500,pointerEvents:'none',whiteSpace:'nowrap' }}>
                WP #{telem.wp_seq}
                {telem.wp_dist != null && ` — ${telem.wp_dist.toFixed(0)} m`}
              </div>
            )}
          </div>

          {/* RIGHT: Video + radio */}
          <div style={{ width:300,flexShrink:0,display:'flex',flexDirection:'column',
                        background:'#111621',borderLeft:'1px solid #252d3d' }}>

            {/* Video */}
            <div ref={videoPanelRef}
              style={{ background:'#000',borderBottom:'1px solid #252d3d',
                       position:'relative',flexShrink:0,
                       // fill full height when in fullscreen
                       ...(videoFullscreen ? { height:'100vh',display:'flex',alignItems:'center',justifyContent:'center' } : {}) }}>
              {videoUrl && !videoError ? (
                <>
                  {/* MJPEG → img tag */}
                  {streamType === 'mjpeg' ? (
                    <img ref={imgRef} src={videoUrl} alt="Live feed"
                      onError={() => setVideoError(true)}
                      style={{ width:'100%',display:'block',
                               maxHeight: videoFullscreen ? '100vh' : 240,
                               objectFit:'contain' }} />
                  ) : (
                    <video ref={videoRef} autoPlay muted playsInline
                      onError={() => setVideoError(true)}
                      style={{ width:'100%',display:'block',
                               maxHeight: videoFullscreen ? '100vh' : 240,
                               objectFit:'contain' }} />
                  )}

                  {/* LIVE badge */}
                  <div style={{ position:'absolute',top:6,left:8,display:'flex',
                                gap:6,alignItems:'center',pointerEvents:'none' }}>
                    <div style={{ width:8,height:8,borderRadius:'50%',background:'#ff5757',
                                  animation:'pulse 1s infinite' }} />
                    <span style={{ background:'rgba(0,0,0,.7)',color:'#3dd68c',
                                   fontSize:10,fontFamily:'monospace',
                                   padding:'2px 6px',borderRadius:3 }}>
                      LIVE
                    </span>
                    <span style={{ background:'rgba(0,0,0,.7)',color:'#7585a0',
                                   fontSize:9,fontFamily:'monospace',textTransform:'uppercase',
                                   padding:'2px 6px',borderRadius:3 }}>
                      {streamType?.toUpperCase()}
                    </span>
                  </div>

                  {/* Fullscreen toggle */}
                  <button onClick={toggleVideoFullscreen}
                    title={videoFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    style={{ position:'absolute',top:6,right:8,background:'rgba(0,0,0,.7)',
                             border:'none',color:'#dde3ef',cursor:'pointer',
                             borderRadius:4,padding:'3px 5px',display:'flex',alignItems:'center' }}>
                    <Maximize2 size={13} />
                  </button>
                </>
              ) : videoUrl && videoError ? (
                <div style={{ height:240,display:'flex',flexDirection:'column',
                              alignItems:'center',justifyContent:'center',
                              gap:8,background:'#060a0e',color:'#4a5568',fontSize:12 }}>
                  <VideoOff size={32} style={{ opacity:.5,color:'#ff5757' }} />
                  <span style={{ color:'#ff5757' }}>Stream unavailable</span>
                  <span style={{ fontSize:10,color:'#4a5568',maxWidth:220,textAlign:'center',
                                 wordBreak:'break-all' }}>{videoUrl}</span>
                  <button onClick={() => setVideoError(false)}
                    style={{ fontSize:10,padding:'3px 10px',borderRadius:4,
                             background:'rgba(74,158,255,.12)',color:'#4a9eff',
                             border:'1px solid rgba(74,158,255,.3)',cursor:'pointer' }}>
                    Retry
                  </button>
                </div>
              ) : (
                <div style={{ height:190,display:'flex',flexDirection:'column',
                              alignItems:'center',justifyContent:'center',
                              gap:8,background:'#060a0e',color:'#4a5568',fontSize:12 }}>
                  <Video size={32} style={{ opacity:.3 }} />
                  <span>No companion URL set</span>
                  <span style={{ fontSize:10,color:'#4a5568',textAlign:'center',padding:'0 12px' }}>
                    Edit this drone and paste the companion PC's Cloudflare Tunnel URL
                  </span>
                </div>
              )}
            </div>

            {/* Radio / signal */}
            <div style={{ padding:12,borderBottom:'1px solid #252d3d',flexShrink:0 }}>
              <div style={{ fontSize:9,fontWeight:700,color:'#7585a0',
                            textTransform:'uppercase',letterSpacing:'.8px',marginBottom:8 }}>
                Radio Link
              </div>
              {['rssi','remrssi'].map((key) => {
                const val = telem?.[key as keyof CompanionFrame] as number | undefined
                const pct = val != null ? Math.round((val / 255) * 100) : 0
                return (
                  <div key={key} style={{ marginBottom:6 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',
                                  fontSize:10,color:'#7585a0',marginBottom:2 }}>
                      <span>{key.toUpperCase()}</span>
                      <span style={{ fontFamily:'monospace',color:'#4a9eff' }}>
                        {val ?? '–'}
                      </span>
                    </div>
                    <div style={{ height:4,background:'#1e2635',borderRadius:2,overflow:'hidden' }}>
                      <div style={{ height:'100%',borderRadius:2,background:'#4a9eff',
                                    width:`${pct}%`,transition:'width .3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Airspeed */}
            <div style={{ padding:12 }}>
              <div style={{ fontSize:9,fontWeight:700,color:'#7585a0',
                            textTransform:'uppercase',letterSpacing:'.8px',marginBottom:8 }}>
                Speed Detail
              </div>
              {[
                ['Groundspeed', spd?.toFixed(1), 'm/s'],
                ['Airspeed',    telem?.airspeed?.toFixed(1), 'm/s'],
                ['Climb Rate',  telem?.climb?.toFixed(2), 'm/s'],
              ].map(([lbl, val, unit]) => (
                <div key={String(lbl)} style={{ display:'flex',justifyContent:'space-between',
                                                fontSize:11,fontFamily:'monospace',
                                                lineHeight:2,color:'#7585a0' }}>
                  <span>{lbl}</span>
                  <span style={{ color:'#dde3ef' }}>{val ?? '–'} <span style={{ fontSize:9 }}>{unit}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Drone Control Panel ── */}
        <div style={{ background:'#0d1117',borderTop:'1px solid #252d3d',flexShrink:0 }}>
          {/* Header */}
          <button
            onClick={() => setCtrlOpen((v) => !v)}
            style={{ width:'100%',display:'flex',alignItems:'center',gap:8,
                     padding:'5px 14px',background:'none',border:'none',cursor:'pointer',
                     color:'#7585a0',fontSize:10,fontWeight:700,
                     letterSpacing:'.7px',textTransform:'uppercase' }}>
            <span style={{ color:'#f5c542' }}>⚡</span> Drone Control
            <span style={{ marginLeft:'auto',fontSize:14 }}>{ctrlOpen ? '▲' : '▼'}</span>
          </button>

          {ctrlOpen && (
            <div style={{ padding:'8px 14px 10px',display:'flex',flexWrap:'wrap',gap:10,
                          alignItems:'flex-end' }}>

              {/* ── Arm / Disarm / Kill ── */}
              <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                <div style={{ fontSize:9,color:'#7585a0',textTransform:'uppercase',
                              letterSpacing:'.7px' }}>Safety</div>
                <div style={{ display:'flex',gap:4 }}>
                  <button onClick={() => confirm('ARM the drone?', () => dispatch('ARM'))}
                    style={{ padding:'5px 10px',borderRadius:5,cursor:'pointer',
                             fontSize:11,fontWeight:700,background:'rgba(61,214,140,.15)',
                             color:'#3dd68c',border:'1px solid rgba(61,214,140,.3)' }}>
                    ARM
                  </button>
                  <button onClick={() => dispatch('DISARM')}
                    style={{ padding:'5px 10px',borderRadius:5,cursor:'pointer',
                             fontSize:11,fontWeight:700,background:'rgba(245,197,66,.1)',
                             color:'#f5c542',border:'1px solid rgba(245,197,66,.3)' }}>
                    DISARM
                  </button>
                  <button onClick={() => confirm('⚠ KILL — force disarm immediately?', () => dispatch('KILL'))}
                    style={{ padding:'5px 10px',borderRadius:5,cursor:'pointer',
                             fontSize:11,fontWeight:700,background:'rgba(255,87,87,.15)',
                             color:'#ff5757',border:'1px solid rgba(255,87,87,.4)' }}>
                    KILL
                  </button>
                </div>
              </div>

              {/* divider */}
              <div style={{ width:1,height:40,background:'#252d3d',alignSelf:'center' }} />

              {/* ── Takeoff ── */}
              <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                <div style={{ fontSize:9,color:'#7585a0',textTransform:'uppercase',
                              letterSpacing:'.7px' }}>Takeoff</div>
                <div style={{ display:'flex',gap:4,alignItems:'center' }}>
                  <input
                    type="number" value={takeoffAlt} min={1} max={120} step={1}
                    onChange={(e) => setTakeoffAlt(e.target.value)}
                    style={{ width:48,padding:'4px 6px',borderRadius:4,border:'1px solid #2e3a50',
                             background:'#1e2635',color:'#dde3ef',fontSize:11,
                             fontFamily:'monospace' }}
                  />
                  <span style={{ fontSize:10,color:'#7585a0' }}>m</span>
                  <button onClick={() => dispatch('TAKEOFF', { param1: parseFloat(takeoffAlt) || 10 })}
                    style={{ padding:'5px 10px',borderRadius:5,cursor:'pointer',
                             fontSize:11,fontWeight:700,background:'rgba(74,158,255,.15)',
                             color:'#4a9eff',border:'1px solid rgba(74,158,255,.3)' }}>
                    ↑ GO
                  </button>
                </div>
              </div>

              {/* ── Nav commands ── */}
              <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                <div style={{ fontSize:9,color:'#7585a0',textTransform:'uppercase',
                              letterSpacing:'.7px' }}>Navigation</div>
                <div style={{ display:'flex',gap:4 }}>
                  {[
                    { label:'LAND',   cmd:'LAND',   color:'#4a9eff' },
                    { label:'RTL',    cmd:'RTL',    color:'#f5c542' },
                    { label:'LOITER', cmd:'LOITER', color:'#a78bfa' },
                  ].map(({ label, cmd, color }) => (
                    <button key={cmd} onClick={() => dispatch(cmd)}
                      style={{ padding:'5px 10px',borderRadius:5,cursor:'pointer',
                               fontSize:11,fontWeight:700,
                               background:`rgba(${hexToRgb(color)},.12)`,
                               color,border:`1px solid rgba(${hexToRgb(color)},.3)` }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Flight modes ── */}
              <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                <div style={{ fontSize:9,color:'#7585a0',textTransform:'uppercase',
                              letterSpacing:'.7px' }}>Mode</div>
                <div style={{ display:'flex',gap:4 }}>
                  {['AUTO', 'STABILIZE', 'ALTHOLD', 'GUIDED'].map((m) => (
                    <button key={m}
                      onClick={() => dispatch('SET_MODE', { mode: m })}
                      style={{ padding:'5px 10px',borderRadius:5,cursor:'pointer',
                               fontSize:11,fontWeight:700,
                               background: mode === m
                                 ? 'rgba(74,158,255,.3)' : 'rgba(255,255,255,.06)',
                               color: mode === m ? '#4a9eff' : '#8896b0',
                               border: mode === m
                                 ? '1px solid rgba(74,158,255,.5)' : '1px solid #252d3d' }}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* divider */}
              <div style={{ width:1,height:40,background:'#252d3d',alignSelf:'center' }} />

              {/* ── Set Speed ── */}
              <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                <div style={{ fontSize:9,color:'#7585a0',textTransform:'uppercase',
                              letterSpacing:'.7px' }}>Set Speed</div>
                <div style={{ display:'flex',gap:4,alignItems:'center' }}>
                  <input
                    type="number" value={targetSpeed} min={0} max={20} step={0.5}
                    onChange={(e) => setTargetSpeed(e.target.value)}
                    style={{ width:48,padding:'4px 6px',borderRadius:4,border:'1px solid #2e3a50',
                             background:'#1e2635',color:'#dde3ef',fontSize:11,
                             fontFamily:'monospace' }}
                  />
                  <span style={{ fontSize:10,color:'#7585a0' }}>m/s</span>
                  <button onClick={() => dispatch('SET_SPEED', { param1: parseFloat(targetSpeed) || 5 })}
                    style={{ padding:'5px 10px',borderRadius:5,cursor:'pointer',
                             fontSize:11,fontWeight:700,background:'rgba(167,139,250,.1)',
                             color:'#a78bfa',border:'1px solid rgba(167,139,250,.3)' }}>
                    SET
                  </button>
                </div>
              </div>

              {/* ── Set Altitude ── */}
              <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                <div style={{ fontSize:9,color:'#7585a0',textTransform:'uppercase',
                              letterSpacing:'.7px' }}>Set Alt</div>
                <div style={{ display:'flex',gap:4,alignItems:'center' }}>
                  <input
                    type="number" value={targetAlt} min={1} max={120} step={1}
                    onChange={(e) => setTargetAlt(e.target.value)}
                    style={{ width:48,padding:'4px 6px',borderRadius:4,border:'1px solid #2e3a50',
                             background:'#1e2635',color:'#dde3ef',fontSize:11,
                             fontFamily:'monospace' }}
                  />
                  <span style={{ fontSize:10,color:'#7585a0' }}>m</span>
                  <button onClick={() => dispatch('SET_ALTITUDE', { param1: parseFloat(targetAlt) || 10 })}
                    style={{ padding:'5px 10px',borderRadius:5,cursor:'pointer',
                             fontSize:11,fontWeight:700,background:'rgba(167,139,250,.1)',
                             color:'#a78bfa',border:'1px solid rgba(167,139,250,.3)' }}>
                    SET
                  </button>
                </div>
              </div>

              {/* divider */}
              <div style={{ width:1,height:40,background:'#252d3d',alignSelf:'center' }} />

              {/* ── Mission ── */}
              <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                <div style={{ fontSize:9,color:'#7585a0',textTransform:'uppercase',
                              letterSpacing:'.7px' }}>Mission</div>
                <button
                  onClick={() => confirm('Start the uploaded mission?', () => dispatch('START_MISSION'))}
                  style={{ padding:'5px 14px',borderRadius:5,cursor:'pointer',
                           fontSize:11,fontWeight:700,background:'rgba(61,214,140,.12)',
                           color:'#3dd68c',border:'1px solid rgba(61,214,140,.3)' }}>
                  ▶ START MISSION
                </button>
              </div>

              {/* sending indicator */}
              {sendCmd.isPending && (
                <div style={{ marginLeft:'auto',fontSize:10,color:'#f5c542',
                              display:'flex',alignItems:'center',gap:4 }}>
                  <Loader2 size={12} className="animate-spin" /> Sending…
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Status bar ── */}
        <div style={{ padding:'4px 14px',background:'#111621',borderTop:'1px solid #252d3d',
                      display:'flex',justifyContent:'space-between',
                      fontSize:10,color:'#7585a0',flexShrink:0 }}>
          <span>
            {lat != null && lng != null
              ? `Position: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
              : 'Waiting for GPS lock…'}
          </span>
          <span>
            {telem
              ? `Last update: ${new Date(telem.timestamp).toLocaleTimeString()}`
              : 'No data received yet'}
          </span>
        </div>
      </div>

      {/* ── Confirm dialog ── */}
      {confirmCmd && (
        <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,.65)',
                      zIndex:60,display:'flex',alignItems:'center',justifyContent:'center' }}>
          <div style={{ background:'#111621',border:'1px solid #ff5757',borderRadius:10,
                        padding:'24px 28px',minWidth:280,textAlign:'center' }}>
            <AlertTriangle size={28} style={{ color:'#ff5757',margin:'0 auto 12px' }} />
            <div style={{ color:'#dde3ef',fontSize:14,marginBottom:20,fontWeight:600 }}>
              {confirmCmd.label}
            </div>
            <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
              <button onClick={() => setConfirmCmd(null)}
                style={{ padding:'7px 20px',borderRadius:6,border:'1px solid #2e3a50',
                         background:'#1e2635',color:'#7585a0',cursor:'pointer',fontSize:12 }}>
                Cancel
              </button>
              <button onClick={() => { confirmCmd.fn(); setConfirmCmd(null) }}
                style={{ padding:'7px 20px',borderRadius:6,border:'none',
                         background:'#ff5757',color:'#fff',cursor:'pointer',
                         fontSize:12,fontWeight:700 }}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


// ── Status badge ───────────────────────────────────────────────────────────────
function statusBadge(s: string) {
  return (
    <span className={
      s === 'Active' ? 'badge-green' : s === 'In_Use' ? 'badge-blue' :
      s === 'Maintenance' ? 'badge-yellow' : 'badge-red'
    }>{s}</span>
  )
}


// ── Main page ─────────────────────────────────────────────────────────────────
export default function DronesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState<Drone | null>(null)
  const [liveView, setLiveView] = useState<Drone | null>(null)

  const { data: drones = [],   isLoading } = useQuery({ queryKey: ['admin-drones'],   queryFn: adminApi.listDrones })
  const { data: stations = [] }            = useQuery({ queryKey: ['admin-stations'], queryFn: adminApi.listStations })
  const { register, handleSubmit, reset }  = useForm()

  const save = useMutation({
    mutationFn: (d: Record<string, unknown>) => {
      // Coerce empty strings to null for optional fields Pydantic expects int|None or str|None
      const cleaned = { ...d }
      if (cleaned.station_id === '' || cleaned.station_id === undefined) cleaned.station_id = null
      else cleaned.station_id = Number(cleaned.station_id)
      
      if (cleaned.drone_companion_url === '') cleaned.drone_companion_url = null
      if (cleaned.drone_live_video_url === '') cleaned.drone_live_video_url = null
      
      // Coerce numeric fields
      if (cleaned.minutes_per_acre !== undefined) cleaned.minutes_per_acre = Number(cleaned.minutes_per_acre)
      if (cleaned.price_per_acre !== undefined) cleaned.price_per_acre = Number(cleaned.price_per_acre)
      if (cleaned.base_setup_time_mins !== undefined) cleaned.base_setup_time_mins = Number(cleaned.base_setup_time_mins)
      if (cleaned.station_refill_time_mins !== undefined) cleaned.station_refill_time_mins = Number(cleaned.station_refill_time_mins)
      if (cleaned.max_acres_per_tank !== undefined) cleaned.max_acres_per_tank = Number(cleaned.max_acres_per_tank)

      return editing ? adminApi.updateDrone(editing.drone_id, cleaned) : adminApi.createDrone(cleaned)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-drones'] })
      toast.success('Saved'); reset(); setShowForm(false); setEditing(null)
    },
    onError: () => toast.error('Failed'),
  })
  const del = useMutation({
    mutationFn: (id: number) => adminApi.deleteDrone(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-drones'] }); toast.success('Deleted') },
    onError: () => toast.error('Delete failed'),
  })

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <Loader2 size={24} className="animate-spin text-brand-500" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Drones ({drones.length})</h1>
        <button onClick={() => { setShowForm(true); setEditing(null); reset() }}
          className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Drone
        </button>
      </div>

      {/* Add/Edit form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">{editing ? 'Edit Drone' : 'Add Drone'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null) }}><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit((d) => save.mutate(d))} className="space-y-4">
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serial No</label>
                    <input {...register('drone_serial_no', { required: true })} className="input" placeholder="DRN-001" disabled={!!editing} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Active Date</label>
                    <input {...register('active_date', { required: true })} type="date" className="input" disabled={!!editing} />
                  </div>
                </>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
                <select {...register('station_id')} className="input">
                  <option value="">Unassigned</option>
                  {stations.map((s: { station_id: number; station_serial_no: string }) => (
                    <option key={s.station_id} value={s.station_id}>{s.station_serial_no}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min/Acre</label>
                  <input {...register('minutes_per_acre')} type="number" className="input" defaultValue={8} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price/Acre (₹)</label>
                  <input {...register('price_per_acre')} type="number" step="0.01" className="input" defaultValue={250} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Setup Buffer (mins)</label>
                  <input {...register('base_setup_time_mins')} type="number" className="input" defaultValue={15} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Refill Time (mins)</label>
                  <input {...register('station_refill_time_mins')} type="number" className="input" defaultValue={5} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Max Acres/Tank</label>
                  <input {...register('max_acres_per_tank')} type="number" step="0.1" className="input" defaultValue={2.5} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Operation Mode</label>
                  <select {...register('operation_type')} className="input">
                    <option>Spray</option><option>Spread</option><option>Both</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Daily Start</label>
                  <input {...register('daily_start_time')} type="time" className="input" defaultValue="06:00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-xs">Daily End</label>
                  <input {...register('daily_end_time')} type="time" className="input" defaultValue="18:00" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Companion PC URL
                  <span className="ml-1 text-xs text-gray-400 font-normal">(Cloudflare Tunnel — for this drone)</span>
                </label>
                <input {...register('drone_companion_url')} className="input"
                  placeholder="https://xxxx.trycloudflare.com" />
                <p className="text-xs text-gray-400 mt-1">
                  Paste the Cloudflare Tunnel URL. Video auto-derives from this.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Video URL Override
                  <span className="ml-1 text-xs text-gray-400 font-normal">(optional — leave blank to auto-derive)</span>
                </label>
                <input {...register('drone_live_video_url')} className="input"
                  placeholder="https://xxxx.trycloudflare.com/custom/stream/index.m3u8" />
                <p className="text-xs text-gray-400 mt-1">
                  Only set this if the HLS path differs from the default. Supports HLS, MJPEG, or native video.
                </p>
              </div>
              {editing && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select {...register('status')} className="input">
                    <option>Active</option><option>In_Use</option>
                    <option>Maintenance</option><option>Retired</option>
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null) }}
                  className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={save.isPending} className="btn-primary flex-1">
                  {save.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drones table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm bg-white rounded-xl border border-gray-100 overflow-hidden">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              {['ID', 'Serial No', 'Station', 'Type', 'Price/Acre', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-xs uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {drones.map((d: Drone) => (
              <tr key={d.drone_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-500">#{d.drone_id}</td>
                <td className="px-4 py-3 font-medium">{d.drone_serial_no}</td>
                <td className="px-4 py-3 text-gray-500">{d.station_id ? `#${d.station_id}` : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{d.operation_type}</td>
                <td className="px-4 py-3">₹{d.price_per_acre}</td>
                <td className="px-4 py-3">{statusBadge(d.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setLiveView(d)}
                      className="text-xs font-medium px-2 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 flex items-center gap-1">
                      <Radio size={11} /> Live GCS
                    </button>
                    <button onClick={() => {
                      setEditing(d); setShowForm(true)
                      reset({
                        drone_serial_no: d.drone_serial_no,
                        active_date: d.active_date,
                        station_id: d.station_id ?? '',
                        drone_companion_url: d.drone_companion_url ?? '',
                        drone_live_video_url: d.drone_live_video_url ?? '',
                        minutes_per_acre: d.minutes_per_acre,
                        price_per_acre: d.price_per_acre,
                        operation_type: d.operation_type,
                        base_setup_time_mins: d.base_setup_time_mins,
                        max_acres_per_tank: d.max_acres_per_tank,
                        station_refill_time_mins: d.station_refill_time_mins,
                        daily_start_time: d.daily_start_time,
                        daily_end_time: d.daily_end_time,
                        status: d.status,
                      })
                    }}
                      className="text-gray-400 hover:text-blue-600 p-1"><Edit2 size={14} /></button>
                    <button onClick={() => { if (confirm('Delete?')) del.mutate(d.drone_id) }}
                      className="text-gray-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Live GCS modal */}
      {liveView && <DroneLiveModal drone={liveView} onClose={() => setLiveView(null)} />}
    </div>
  )
}
