import { useState, useCallback, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { useScannerStore } from "@/stores/scanner-store";
import type { BulkSyncResult } from "@/types";

interface UseOfflineSyncReturn {
  isSyncing: boolean;
  syncResult: BulkSyncResult | null;
}

/**
 * Watch for offline → online transitions and automatically sync
 * any queued offline check-ins to the server.
 *
 * Handles partial sync failures: items that successfully synced are removed
 * from the queue, while failed items are kept for the next sync attempt.
 */
let isGlobalSyncing = false;

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<BulkSyncResult | null>(null);
  const wasOffline = useRef(!navigator.onLine);

  const offlineQueue = useScannerStore((s) => s.offlineQueue);
  const removeFromOfflineQueue = useScannerStore((s) => s.removeFromOfflineQueue);
  const clearOfflineQueue = useScannerStore((s) => s.clearOfflineQueue);

  const syncQueue = useCallback(async () => {
    // Prevent concurrent sync calls across all hook instances
    if (isGlobalSyncing) return;

    const queue = useScannerStore.getState().offlineQueue;
    if (queue.length === 0) return;

    isGlobalSyncing = true;
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const { data } = await api.post<BulkSyncResult>("/checkin/bulk-sync", {
        checkins: queue,
      });

      setSyncResult(data);

      // Selectively remove items that were successfully processed (synced or skipped)
      if (data.details && data.details.length > 0) {
        const currentQueue = useScannerStore.getState().offlineQueue;
        data.details.forEach((detail, index) => {
          if (detail.status === "synced" || detail.status === "skipped") {
            const targetHash = detail.hash || currentQueue[index]?.hash;
            if (targetHash) {
              removeFromOfflineQueue(targetHash);
            }
          }
        });
      } else {
        const successCount = (data.synced ?? 0) + (data.skipped ?? 0);
        if (data.errors === 0) {
          clearOfflineQueue();
        } else if (successCount > 0) {
          const currentQueue = useScannerStore.getState().offlineQueue;
          const toRemove = currentQueue.slice(0, successCount);
          toRemove.forEach((item) => removeFromOfflineQueue(item.hash));
        }
      }
    } catch (error) {
      console.error("[useOfflineSync] Bulk sync failed:", error);
      // Keep queue intact for next retry — do not clear anything
    } finally {
      setIsSyncing(false);
      isGlobalSyncing = false;
    }
  }, [clearOfflineQueue, removeFromOfflineQueue]);

  useEffect(() => {
    const handleOnline = () => {
      // Only sync when transitioning from offline → online
      if (wasOffline.current) {
        wasOffline.current = false;
        void syncQueue();
      }
    };

    const handleOffline = () => {
      wasOffline.current = true;
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncQueue]);

  // Also trigger sync if we mount while online with a non-empty queue
  useEffect(() => {
    if (navigator.onLine && offlineQueue.length > 0) {
      void syncQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isSyncing, syncResult };
}
