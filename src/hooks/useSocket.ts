import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'

/**
 * useSocket: Returns a socket connection.
 * If a url is provided, it creates a unique connection for that URL.
 * Otherwise, it uses the global VITE_SOCKET_URL.
 */
export function useSocket(url?: string) {
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const targetUrl = url || import.meta.env.VITE_SOCKET_URL || ''
    if (!targetUrl) return

    const token = localStorage.getItem('access_token')
    
    const socket = io(targetUrl, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [url])

  const on = useCallback((event: string, cb: (...args: any[]) => void) => {
    socketRef.current?.on(event, cb)
    return () => { socketRef.current?.off(event, cb) }
  }, [])

  const emit = useCallback((event: string, ...args: any[]) => {
    socketRef.current?.emit(event, ...args)
  }, [])

  return { socket: socketRef.current, connected, on, emit }
}
