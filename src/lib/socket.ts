import { io, type Socket } from "socket.io-client";
import { SocketEvent } from "@/types";

let socket: Socket | null = null;
/** Track current room for auto-rejoin on reconnect */
let currentRoom: { eventId: string; token: string } | null = null;

/**
 * Get or create a Socket.io connection (lazy singleton).
 * Registers a 'connect' listener that re-joins the room on reconnect.
 */
function getSocket(): Socket {
  if (!socket) {
    socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:4000", {
      path: "/socket.io",
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      transports: ["websocket", "polling"],
    });

    // Auto-rejoin room after reconnection.
    // 'connect' fires on the initial connection AND every subsequent reconnect.
    socket.on("connect", () => {
      if (currentRoom) {
        socket?.emit(SocketEvent.JOIN_EVENT, {
          eventId: currentRoom.eventId,
        });
      }
    });

    socket.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message);
    });
  }
  return socket;
}

/**
 * Connect and join an event room.
 * Tracks the current room so it can be rejoined on reconnect.
 */
export function joinEventRoom(eventId: string, token: string): void {
  const s = getSocket();
  // Update auth token
  s.auth = { token };
  // Track room for reconnection
  currentRoom = { eventId, token };

  if (!s.connected) s.connect();

  // Emit JOIN_EVENT immediately if already connected.
  // If not yet connected, the 'connect' event handler above will emit it.
  if (s.connected) {
    s.emit(SocketEvent.JOIN_EVENT, { eventId });
  }
}

/**
 * Leave an event room and optionally disconnect.
 */
export function leaveEventRoom(eventId: string): void {
  const s = getSocket();
  currentRoom = null;
  if (s.connected) {
    s.emit(SocketEvent.LEAVE_EVENT, { eventId });
  }
}

/**
 * Subscribe to incoming checkin events.
 * Returns an unsubscribe function.
 */
export function onCheckinEvent(handler: (data: unknown) => void): () => void {
  const s = getSocket();
  s.on("checkin", handler);
  return () => s.off("checkin", handler);
}

/**
 * Disconnect the socket entirely.
 */
export function disconnectSocket(): void {
  if (socket) {
    currentRoom = null;
    socket.disconnect();
    socket = null;
  }
}

export { getSocket };
