import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'

/**
 * useSocket: Returns a socket connection.
 * If a url is provided, it creates a unique connection for that URL.
 * Otherwise, it uses the global VITE_SOCKET_URL.
 */
export function useSocket(url?: string) {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<WebSocket | null>(null)
  const handlersRef = useRef<Record<string, ((data: any) => void)[]>>({})

  useEffect(() => {
    if (!url) return

// Ensure URL has a protocol and ends with /ws
    let wsUrl = url
    if (/^https?:\/\//i.test(wsUrl)) {
      // If it starts with http:// or https://, swap it to ws:// or wss://
      wsUrl = wsUrl.replace(/^http/i, 'ws')
    } else if (!/^wss?:\/\//i.test(wsUrl)) {
      // If it has no protocol at all, assume wss:// (or ws:// for localhost)
      wsUrl = (url.includes('localhost') || url.includes('127.0.0.1')) ? `ws://${url}` : `wss://${url}`
    }

    if (!wsUrl.endsWith('/ws')) {
      wsUrl = wsUrl.replace(/\/$/, '') + '/ws'
    }

    console.log(`[Socket] Attempting connection to: ${wsUrl}`)
    const ws = new WebSocket(wsUrl)
    let pingInterval: any

    ws.onopen = () => {
      console.log(`[Socket] ✓ Connected to ${wsUrl}`)
      setConnected(true)
      // Keep-alive ping for Cloudflare Tunnels
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send('ping')
        }
      }, 20000)
    }

    ws.onclose = (event) => {
      console.log(`[Socket] ✗ Disconnected from ${wsUrl}. Code: ${event.code}, Reason: ${event.reason}`)
      setConnected(false)
      if (pingInterval) clearInterval(pingInterval)
    }

    ws.onerror = (err) => {
      console.error(`[Socket] ! Error on ${wsUrl}:`, err)
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        const type = payload.type
        // Some backends might send data at root or in .data
        const data = payload.data || (type === 'telemetry' ? payload : null)
        
        if (type === 'telemetry' && data) {
          // Sync coordinates
          if (data.lon !== undefined && data.lng === undefined) data.lng = data.lon
          if (data.lng !== undefined && data.lon === undefined) data.lon = data.lng
          
          // Sync battery
          if (data.battery_v !== undefined) data.battery_voltage = data.battery_v
          if (data.battery_pct !== undefined) data.battery_remaining = data.battery_pct
          if (data.current_a !== undefined) data.battery_current = data.current_a
          
          // Sync system states
          if (data.wp_current !== undefined) data.wp_seq = data.wp_current
          if (data.speed !== undefined && data.groundspeed === undefined) data.groundspeed = data.speed
          if (data.mode !== undefined && data.flight_mode === undefined) data.flight_mode = data.mode
          
          // Debug log for incoming telemetry
          console.debug('[Socket] Telemetry received:', data)
        }

        const eventName = type === 'telemetry' ? 'drone_telemetry' : type

        if (handlersRef.current[eventName]) {
          handlersRef.current[eventName].forEach(cb => cb(data))
        }
      } catch (e) {
        console.error('[Socket] Parse error', e)
      }
    }

    socketRef.current = ws

    return () => {
      ws.close()
    }
  }, [url])

  const on = useCallback((event: string, cb: (data: any) => void) => {
    if (!handlersRef.current[event]) handlersRef.current[event] = []
    handlersRef.current[event].push(cb)
    return () => {
      handlersRef.current[event] = handlersRef.current[event].filter(c => c !== cb)
    }
  }, [])

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: event, data }))
    }
  }, [])

  return { connected, on, emit }
}