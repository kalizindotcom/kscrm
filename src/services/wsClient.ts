import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store';

const WS_URL = (import.meta.env.VITE_WS_URL as string | undefined) ?? (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket) return socket;

  const token = useAuthStore.getState().token;
  socket = io(WS_URL, {
    path: '/ws',
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  socket.on('connect_error', (err) => {
    console.warn('[WS] connect_error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribe(room: string) {
  getSocket().emit('subscribe', room);
}

export function unsubscribe(room: string) {
  if (socket) socket.emit('unsubscribe', room);
}
