import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

// Runtime override (Cloudflare Tunnel URL) takes priority over build-time env var
const SOCKET_URL = localStorage.getItem('drone_backend_url') || import.meta.env.VITE_SOCKET_URL || ''

let globalSocket: Socket | null = null

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return

    if (!globalSocket || !globalSocket.connected) {
      globalSocket = io(SOCKET_URL, {
        path: '/socket.io',
        auth: { token },
        transports: ['websocket'],
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      })
    }

    socketRef.current = globalSocket
    return () => {
      // Don't disconnect on unmount — keep alive for other components
    }
  }, [])

  const on = useCallback((event: string, cb: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, cb)
    return () => { socketRef.current?.off(event, cb) }
  }, [])

  const emit = useCallback((event: string, ...args: unknown[]) => {
    socketRef.current?.emit(event, ...args)
  }, [])

  return { socket: socketRef.current, on, emit }
}
