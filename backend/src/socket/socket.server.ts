import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken, AccessTokenPayload } from '../shared/tokens';
import { logger } from '../shared/logger';
import { env } from '../config/env';

export function getGridRoom(lat: number, lng: number): string {
  const cellX = Math.floor(lng / 0.01);
  const cellY = Math.floor(lat / 0.01);
  return `geo:${cellX}:${cellY}`;
}

export function parseCookieHeader(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    if (parts.length === 2) {
      list[parts[0].trim()] = decodeURIComponent(parts[1].trim());
    }
  });

  return list;
}

let ioServer: SocketIOServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.NODE_ENV === 'production' ? env.FRONTEND_URL : true,
      credentials: true,
    },
  });

  ioServer = io;

  // Citizens Namespace (/live/citizens)
  const citizensNamespace = io.of('/live/citizens');

  citizensNamespace.use((socket: Socket, next) => {
    try {
      const cookies = parseCookieHeader(socket.handshake.headers.cookie);
      const token = cookies.access_token;
      if (token) {
        const payload = verifyAccessToken(token);
        socket.data.user = payload;
      }
    } catch {
      // Anonymous connection permitted for citizens namespace
      socket.data.user = null;
    }
    next();
  });

  citizensNamespace.on('connection', (socket: Socket) => {
    logger.debug('Citizen socket connected', { socketId: socket.id, user: socket.data.user?.id || 'anonymous' });

    socket.on('set_location', (data: { lat?: number; lng?: number }) => {
      const { lat, lng } = data || {};
      if (
        typeof lat !== 'number' ||
        typeof lng !== 'number' ||
        isNaN(lat) ||
        isNaN(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        socket.emit('error', { message: 'Invalid latitude or longitude coordinates.' });
        return;
      }

      // Leave old grid rooms if any
      for (const room of socket.rooms) {
        if (room.startsWith('geo:')) {
          socket.leave(room);
        }
      }

      const gridRoom = getGridRoom(lat, lng);
      socket.join(gridRoom);
      socket.emit('location_updated', { gridRoom, lat, lng });
    });
  });

  // Dispatchers Namespace (/live/dispatchers)
  const dispatchersNamespace = io.of('/live/dispatchers');

  dispatchersNamespace.use((socket: Socket, next) => {
    const cookies = parseCookieHeader(socket.handshake.headers.cookie);
    const token = cookies.access_token;

    if (!token) {
      return next(new Error('UNAUTHORIZED'));
    }

    try {
      const payload = verifyAccessToken(token);
      const allowedRoles = ['VOLUNTEER', 'NGO', 'AUTHORITY', 'ADMIN'];
      const hasPermission = payload.roles.some((r) => allowedRoles.includes(r));

      if (!hasPermission) {
        return next(new Error('FORBIDDEN'));
      }

      socket.data.user = payload;
      next();
    } catch {
      return next(new Error('UNAUTHORIZED'));
    }
  });

  dispatchersNamespace.on('connection', (socket: Socket) => {
    logger.info('Dispatcher socket connected', { socketId: socket.id, userId: socket.data.user.id });
    socket.join('dispatchers_room');
  });

  logger.info('Socket.IO server initialized with /live/citizens and /live/dispatchers namespaces.');
  return io;
}

export function getIOServer(): SocketIOServer | null {
  return ioServer;
}
