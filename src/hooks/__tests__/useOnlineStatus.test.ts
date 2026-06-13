import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@/test/test-utils";
import { useOnlineStatus } from "../useOnlineStatus";
import { useScannerStore } from "@/stores/scanner-store";

describe("useOnlineStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset scanner store
    useScannerStore.getState().reset();
    // Default to online
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("Initial state", () => {
    it("returns true when online", () => {
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(true);
    });

    it("returns false when offline", () => {
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(false);
    });
  });

  describe("Online/Offline transitions", () => {
    it("returns updated value when coming online", () => {
      // Start offline
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(false);

      // Go online
      act(() => {
        Object.defineProperty(navigator, "onLine", {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event("online"));
      });

      expect(result.current).toBe(true);
    });

    it("returns updated value when going offline", () => {
      // Start online
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      const { result } = renderHook(() => useOnlineStatus());
      expect(result.current).toBe(true);

      // Go offline
      act(() => {
        Object.defineProperty(navigator, "onLine", {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event("offline"));
      });

      expect(result.current).toBe(false);
    });

    it("updates scanner store when status changes", () => {
      // Start offline
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      renderHook(() => useOnlineStatus());
      expect(useScannerStore.getState().isOnline).toBe(false);

      // Go online
      act(() => {
        Object.defineProperty(navigator, "onLine", {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event("online"));
      });

      expect(useScannerStore.getState().isOnline).toBe(true);
    });
  });

  describe("Event listener cleanup", () => {
    it("cleans up event listeners on unmount", () => {
      const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");

      const { unmount } = renderHook(() => useOnlineStatus());
      unmount();

      // Should have removed both online and offline listeners
      expect(removeEventListenerSpy).toHaveBeenCalledWith("online", expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith("offline", expect.any(Function));
    });
  });
});
