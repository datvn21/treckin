import { create } from "zustand";
import { api } from "@/lib/api";
import type { QRGenerateResponse } from "@/types";

interface QRState {
  currentHash: string | null;
  expiresAt: number | null;
  timeRemaining: number;
  isRefreshing: boolean;
  eventId: string | null;
  error: string | null;

  // Internal
  _countdownInterval: ReturnType<typeof setInterval> | null;

  // Actions
  refreshQR: (eventId: string) => Promise<void>;
  startCountdown: () => void;
  stopCountdown: () => void;
  setEventId: (eventId: string) => void;
  reset: () => void;
}

const QR_TTL_SECONDS = 30;
const QR_REFRESH_BUFFER = 5; // Refresh 5s before expiry

export const useQRStore = create<QRState>()((set, get) => ({
  currentHash: null,
  expiresAt: null,
  timeRemaining: QR_TTL_SECONDS,
  isRefreshing: false,
  eventId: null,
  error: null,
  _countdownInterval: null,

  setEventId: (eventId) => set({ eventId }),

  refreshQR: async (eventId) => {
    set({ isRefreshing: true, error: null });
    try {
      const { data } = await api.post<QRGenerateResponse>("/qr/generate", {
        eventId,
      });
      set({
        currentHash: data.hash,
        expiresAt: data.expiresAt,
        timeRemaining: data.ttl,
        isRefreshing: false,
      });
      // Restart countdown after refresh
      get().startCountdown();
    } catch {
      set({
        isRefreshing: false,
        error: "Không thể tạo mã QR. Vui lòng thử lại.",
      });
    }
  },

  startCountdown: () => {
    const state = get();
    // Clear existing interval
    if (state._countdownInterval) {
      clearInterval(state._countdownInterval);
    }

    const interval = setInterval(() => {
      const current = get();
      const remaining = current.timeRemaining - 1;

      if (remaining <= 0) {
        // Time's up — auto-refresh
        set({ timeRemaining: 0 });
        if (current.eventId) {
          void current.refreshQR(current.eventId);
        }
        return;
      }

      // Auto-refresh 5s before expiry for seamless transition
      if (remaining === QR_REFRESH_BUFFER && current.eventId) {
        void current.refreshQR(current.eventId);
        return;
      }

      set({ timeRemaining: remaining });
    }, 1000);

    set({ _countdownInterval: interval });
  },

  stopCountdown: () => {
    const state = get();
    if (state._countdownInterval) {
      clearInterval(state._countdownInterval);
      set({ _countdownInterval: null });
    }
  },

  reset: () => {
    const state = get();
    state.stopCountdown();
    set({
      currentHash: null,
      expiresAt: null,
      timeRemaining: QR_TTL_SECONDS,
      isRefreshing: false,
      eventId: null,
      error: null,
    });
  },
}));
