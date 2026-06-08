import { io, type Socket } from "socket.io-client";
import { SocketEvent } from "@/types";

let socket: Socket | null = null;

/**
 * Get or create a Socket.io connection (lazy singleton).
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:4000", {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

/**
 * Connect and join an event room.
 */
export function joinEventRoom(eventId: string, token: string): void {
  const s = getSocket();
  s.auth = { token };
  if (!s.connected) s.connect();
  s.emit(SocketEvent.JOIN_EVENT, { eventId });
}

/**
 * Leave an event room and optionally disconnect.
 */
export function leaveEventRoom(eventId: string): void {
  const s = getSocket();
  s.emit(SocketEvent.LEAVE_EVENT, { eventId });
}

/**
 * Disconnect the socket entirely.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
