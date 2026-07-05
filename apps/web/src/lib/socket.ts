import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
    socket = io(url, { withCredentials: true, autoConnect: false });
  }
  return socket;
}

export function connectSocket(userId: string) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit('join', userId);
  s.emit('join:all');
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}
