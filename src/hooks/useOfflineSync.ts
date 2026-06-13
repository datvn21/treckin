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
export function useOfflineSync(): UseOfflineSyncReturn {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<BulkSyncResult | null>(null);
  const wasOffline = useRef(!navigator.onLine);
  const isSyncingRef = useRef(false); // prevent concurrent syncs

  const offlineQueue = useScannerStore((s) => s.offlineQueue);
  const removeFromOfflineQueue = useScannerStore((s) => s.removeFromOfflineQueue);
  const clearOfflineQueue = useScannerStore((s) => s.clearOfflineQueue);

  const syncQueue = useCallback(async () => {
    // Prevent concurrent sync calls
    if (isSyncingRef.current) return;

    const queue = useScannerStore.getState().offlineQueue;
    if (queue.length === 0) return;

    isSyncingRef.current = true;
    setIsSyncing(true);
    setSyncResult(null);

    try {
      const { data } = await api.post<BulkSyncResult>("/checkin/bulk-sync", {
        checkins: queue,
      });

      setSyncResult(data);

      // Selectively remove only items that were successfully processed
      // (synced or already-checked-in counts as handled)
      if (data.details && data.details.length > 0) {
        // If we can't match by userId+eventId, fall back to clearing all
        // if there are no errors reported
        if (data.errors === 0) {
          clearOfflineQueue();
        } else {
          // Keep items that errored for retry
          // Since we don't have the hash in details, we clear items based on
          // successful count
          const successCount = data.synced + data.skipped;
          const currentQueue = useScannerStore.getState().offlineQueue;
          // Remove the first `successCount` items (oldest first were sent first)
          const toRemove = currentQueue.slice(0, successCount);
          toRemove.forEach((item) => removeFromOfflineQueue(item.hash));
        }
      } else {
        // No details available — clear all if no errors
        if (data.errors === 0) {
          clearOfflineQueue();
        }
      }
    } catch (error) {
      console.error("[useOfflineSync] Bulk sync failed:", error);
      // Keep queue intact for next retry — do not clear anything
    } finally {
      setIsSyncing(false);
      isSyncingRef.current = false;
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
