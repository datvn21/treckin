import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CheckinRecord, ScanResult, Event, Board, OfflineCheckin } from "@/types";

interface ScannerState {
  // Current context
  currentEvent: Event | null;
  currentBoard: Board | null;

  // Scan state
  scanResult: ScanResult | null;
  isScanning: boolean;
  isProcessing: boolean;

  // Checkin data
  recentCheckins: CheckinRecord[];
  totalCheckins: number;

  // Offline support
  isOnline: boolean;
  offlineQueue: OfflineCheckin[];

  // Actions
  setEvent: (event: Event) => void;
  setBoard: (board: Board) => void;
  setScanResult: (result: ScanResult | null) => void;
  setScanning: (scanning: boolean) => void;
  setProcessing: (processing: boolean) => void;

  addCheckin: (record: CheckinRecord) => void;
  setTotalCheckins: (total: number) => void;

  setOnline: (online: boolean) => void;
  queueOffline: (item: OfflineCheckin) => void;
  clearOfflineQueue: () => void;
  removeFromOfflineQueue: (hash: string) => void;

  clearResult: () => void;
  reset: () => void;
}

const MAX_RECENT_CHECKINS = 20;
/** Max items in offline queue to prevent unbounded memory growth */
const MAX_OFFLINE_QUEUE = 500;

export const useScannerStore = create<ScannerState>()(
  persist(
    (set) => ({
      currentEvent: null,
      currentBoard: null,
      scanResult: null,
      isScanning: true,
      isProcessing: false,
      recentCheckins: [],
      totalCheckins: 0,
      isOnline: navigator.onLine,
      offlineQueue: [],

      setEvent: (event) => set({ currentEvent: event }),
      setBoard: (board) => set({ currentBoard: board }),

      setScanResult: (result) => set({ scanResult: result, isProcessing: false }),
      setScanning: (scanning) => set({ isScanning: scanning }),
      setProcessing: (processing) => set({ isProcessing: processing }),

      addCheckin: (record) =>
        set((state) => ({
          recentCheckins: [record, ...state.recentCheckins].slice(0, MAX_RECENT_CHECKINS),
          totalCheckins: state.totalCheckins + 1,
        })),

      setTotalCheckins: (total) => set({ totalCheckins: total }),

      setOnline: (online) => set({ isOnline: online }),

      queueOffline: (item) =>
        set((state) => {
          // Deduplicate by hash to prevent double-queueing same QR
          if (state.offlineQueue.some((q) => q.hash === item.hash)) {
            return state;
          }
          // Enforce max queue size to prevent memory issues
          const newQueue = [...state.offlineQueue, item];
          if (newQueue.length > MAX_OFFLINE_QUEUE) {
            newQueue.shift(); // remove oldest
          }
          return { offlineQueue: newQueue };
        }),

      clearOfflineQueue: () => set({ offlineQueue: [] }),

      removeFromOfflineQueue: (hash) =>
        set((state) => ({
          offlineQueue: state.offlineQueue.filter((q) => q.hash !== hash),
        })),

      clearResult: () => set({ scanResult: null }),

      reset: () =>
        set({
          currentEvent: null,
          currentBoard: null,
          scanResult: null,
          isScanning: true,
          isProcessing: false,
          recentCheckins: [],
          totalCheckins: 0,
          // Note: do NOT clear offlineQueue on reset — preserve for sync
        }),
    }),
    {
      name: "treckin-scanner-offline",
      storage: createJSONStorage(() => localStorage),
      // Only persist the offline queue — UI state is ephemeral
      partialize: (state) => ({
        offlineQueue: state.offlineQueue,
      }),
    }
  )
);
