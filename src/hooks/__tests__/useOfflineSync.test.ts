import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@/test/test-utils";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useScannerStore } from "@/stores/scanner-store";
import type { BulkSyncResult } from "@/types";

// Mock the api module
vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

describe("useOfflineSync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset the scanner store
    useScannerStore.getState().clearOfflineQueue();
    useScannerStore.getState().reset();
    // Reset online status
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: true,
    });
    // Fire initial online event to reset wasOffline flag
    window.dispatchEvent(new Event("online"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Initial state", () => {
    it("returns initial isSyncing as false", () => {
      const { result } = renderHook(() => useOfflineSync());
      expect(result.current.isSyncing).toBe(false);
    });

    it("returns initial syncResult as null", () => {
      const { result } = renderHook(() => useOfflineSync());
      expect(result.current.syncResult).toBeNull();
    });
  });

  describe("Offline to Online transition", () => {
    it("triggers sync when going from offline to online with queued items", async () => {
      const { api } = await import("@/lib/api");
      const mockPost = vi.mocked(api.post);

      mockPost.mockResolvedValueOnce({
        data: {
          synced: 1,
          skipped: 0,
          errors: 0,
        } as BulkSyncResult,
      });

      // Add an offline checkin
      useScannerStore.getState().queueOffline({
        hash: "test-hash-1",
        scannedAt: new Date().toISOString(),
        boardId: "board-1",
      });

      // Start with offline
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useOfflineSync());

      // Transition to online
      act(() => {
        Object.defineProperty(navigator, "onLine", {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event("online"));
      });

      await waitFor(() => {
        expect(result.current.isSyncing).toBe(true);
      });
    });

    it("does not trigger sync when already online (no transition)", async () => {
      const { api } = vi.mocked(await import("@/lib/api"));
      const mockPost = api.post;

      useScannerStore.getState().queueOffline({
        hash: "test-hash",
        scannedAt: new Date().toISOString(),
        boardId: "board-1",
      });

      // Already online
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      renderHook(() => useOfflineSync());

      // Should not immediately call post
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe("Sync on mount with existing queue", () => {
    it("triggers sync when mounted with non-empty offline queue and online", async () => {
      const { api } = await import("@/lib/api");
      const mockPost = vi.mocked(api.post);

      mockPost.mockResolvedValueOnce({
        data: {
          synced: 1,
          skipped: 0,
          errors: 0,
        } as BulkSyncResult,
      });

      // Pre-populate the queue before mounting the hook
      useScannerStore.getState().queueOffline({
        hash: "pre-existing-hash",
        scannedAt: new Date().toISOString(),
        boardId: "board-1",
      });

      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      const { result } = renderHook(() => useOfflineSync());

      // Should trigger sync on mount
      await waitFor(() => {
        expect(result.current.isSyncing).toBe(true);
      });
    });

    it("does not trigger sync when queue is empty", async () => {
      const { api } = vi.mocked(await import("@/lib/api"));
      const mockPost = api.post;

      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      renderHook(() => useOfflineSync());

      // Should not call API when queue is empty
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  describe("Queue clearing behavior", () => {
    it("clears queue when sync succeeds with no errors", async () => {
      const { api } = await import("@/lib/api");
      const mockPost = vi.mocked(api.post);

      mockPost.mockResolvedValueOnce({
        data: {
          synced: 2,
          skipped: 0,
          errors: 0,
          details: [],
        } as BulkSyncResult,
      });

      useScannerStore.getState().queueOffline({
        hash: "hash-1",
        scannedAt: new Date().toISOString(),
        boardId: "board-1",
      });
      useScannerStore.getState().queueOffline({
        hash: "hash-2",
        scannedAt: new Date().toISOString(),
        boardId: "board-1",
      });

      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(useScannerStore.getState().offlineQueue).toHaveLength(0);
      });
    });

    it("keeps failed items when sync has errors", async () => {
      const { api } = await import("@/lib/api");
      const mockPost = vi.mocked(api.post);

      mockPost.mockResolvedValueOnce({
        data: {
          synced: 1,
          skipped: 0,
          errors: 1,
          details: [],
        } as BulkSyncResult,
      });

      useScannerStore.getState().queueOffline({
        hash: "hash-1",
        scannedAt: new Date().toISOString(),
        boardId: "board-1",
      });
      useScannerStore.getState().queueOffline({
        hash: "hash-2",
        scannedAt: new Date().toISOString(),
        boardId: "board-1",
      });

      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      renderHook(() => useOfflineSync());

      await waitFor(() => {
        // One failed item should remain
        expect(useScannerStore.getState().offlineQueue).toHaveLength(1);
        expect(useScannerStore.getState().offlineQueue[0]?.hash).toBe("hash-2");
      });
    });
  });

  describe("Error handling", () => {
    it("keeps queue intact when sync fails", async () => {
      const { api } = await import("@/lib/api");
      const mockPost = vi.mocked(api.post);

      mockPost.mockRejectedValueOnce(new Error("Network error"));

      useScannerStore.getState().queueOffline({
        hash: "failed-hash",
        scannedAt: new Date().toISOString(),
        boardId: "board-1",
      });

      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      renderHook(() => useOfflineSync());

      await waitFor(() => {
        // Queue should still have the failed item
        expect(useScannerStore.getState().offlineQueue).toHaveLength(1);
        expect(useScannerStore.getState().offlineQueue[0]?.hash).toBe("failed-hash");
      });
    });

    it("sets syncResult on successful sync", async () => {
      const mockResult: BulkSyncResult = {
        synced: 1,
        skipped: 0,
        errors: 0,
        details: [],
      };

      const { api } = await import("@/lib/api");
      const mockPost = vi.mocked(api.post);

      mockPost.mockResolvedValueOnce({
        data: mockResult,
      });

      useScannerStore.getState().queueOffline({
        hash: "result-hash",
        scannedAt: new Date().toISOString(),
        boardId: "board-1",
      });

      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.syncResult).toEqual(mockResult);
      });
    });
  });

  describe("Concurrent sync prevention", () => {
    it("prevents concurrent syncs", async () => {
      const { api } = await import("@/lib/api");
      const mockPost = vi.mocked(api.post);

      mockPost.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ data: { synced: 1, errors: 0, details: [] } }), 100),
          ),
      );

      useScannerStore.getState().queueOffline({
        hash: "concurrent-hash",
        scannedAt: new Date().toISOString(),
        boardId: "board-1",
      });

      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      renderHook(() => useOfflineSync());

      // Wait a bit and try to trigger another sync
      await vi.advanceTimersByTimeAsync(10);

      // Mount another hook - should not trigger a second sync
      const { result: result2 } = renderHook(() => useOfflineSync());
      // Reference result2 so the variable isn't flagged as unused
      void result2;

      // Only one sync should have been called
      expect(mockPost).toHaveBeenCalledTimes(1);
    });
  });
});
