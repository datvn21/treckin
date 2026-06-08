import { create } from "zustand";
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

export const useScannerStore = create<ScannerState>()((set) => ({
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
    set((state) => ({
      offlineQueue: [...state.offlineQueue, item],
    })),

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
      offlineQueue: [],
    }),
}));
