import { useEffect, useSyncExternalStore } from "react";
import { useScannerStore } from "@/stores/scanner-store";

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

/**
 * Reactive online/offline status using useSyncExternalStore.
 * Automatically syncs with the scanner store.
 */
export function useOnlineStatus(): boolean {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot);
  const setOnline = useScannerStore((s) => s.setOnline);

  useEffect(() => {
    setOnline(isOnline);
  }, [isOnline, setOnline]);

  return isOnline;
}
