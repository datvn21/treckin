import { useEffect } from "react";
import { getSocket, joinEventRoom, leaveEventRoom } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth-store";
import { useScannerStore } from "@/stores/scanner-store";
import { SocketEvent } from "@/types";
import type { SocketCheckinPayload } from "@/types";

/**
 * Connect to socket.io, join event room, and listen for real-time
 * check-in updates from other scanner boards.
 */
export function useSocket(eventId: string | undefined): void {
  const token = useAuthStore((s) => s.token);
  const addCheckin = useScannerStore((s) => s.addCheckin);
  const setTotalCheckins = useScannerStore((s) => s.setTotalCheckins);

  useEffect(() => {
    if (!eventId || !token) return;

    joinEventRoom(eventId, token);

    const socket = getSocket();

    const handleCheckin = (payload: SocketCheckinPayload) => {
      addCheckin(payload.checkinRecord);
      setTotalCheckins(payload.totalCheckins);
    };

    socket.on(SocketEvent.CHECKIN_SUCCESS, handleCheckin);

    return () => {
      socket.off(SocketEvent.CHECKIN_SUCCESS, handleCheckin);
      leaveEventRoom(eventId);
    };
  }, [eventId, token, addCheckin, setTotalCheckins]);
}
