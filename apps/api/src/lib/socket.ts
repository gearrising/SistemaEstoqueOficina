import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';

let io: Server | null = null;

export function initSocket(httpServer: HttpServer) {
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('join', (userId: string) => {
      if (userId) socket.join(`user:${userId}`);
    });
    socket.on('join:all', () => {
      socket.join('broadcast');
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) throw new Error('Socket.io não inicializado');
  return io;
}

export function emitNotification(
  event: string,
  data: Record<string, unknown>,
  userId?: string
) {
  if (!io) return;
  if (userId) {
    io.to(`user:${userId}`).emit(event, data);
  }
  io.to('broadcast').emit(event, data);
}
