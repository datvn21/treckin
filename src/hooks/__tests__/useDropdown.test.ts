import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@/test/test-utils";
import { useDropdown } from "../useDropdown";

describe("useDropdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Initial state", () => {
    it("starts with open as false", () => {
      const { result } = renderHook(() => useDropdown());
      expect(result.current.open).toBe(false);
    });

    it("returns a ref", () => {
      const { result } = renderHook(() => useDropdown());
      expect(result.current.ref).toHaveProperty("current");
    });
  });

  describe("setOpen function", () => {
    it("can set open to true", () => {
      const { result } = renderHook(() => useDropdown());
      
      act(() => {
        result.current.setOpen(true);
      });

      expect(result.current.open).toBe(true);
    });

    it("can set open to false", () => {
      const { result } = renderHook(() => useDropdown());
      
      act(() => {
        result.current.setOpen(true);
      });
      expect(result.current.open).toBe(true);

      act(() => {
        result.current.setOpen(false);
      });
      expect(result.current.open).toBe(false);
    });
  });

  describe("Outside click handling", () => {
    it("closes dropdown when clicking outside the ref", () => {
      const { result } = renderHook(() => useDropdown());

      // Open the dropdown
      act(() => {
        result.current.setOpen(true);
      });
      expect(result.current.open).toBe(true);

      // Simulate click outside
      act(() => {
        document.dispatchEvent(new MouseEvent("mousedown", {
          bubbles: true,
          target: document.body,
        }));
      });

      expect(result.current.open).toBe(false);
    });

    it("does not close when clicking inside the ref", () => {
      const { result } = renderHook(() => useDropdown());

      // Open the dropdown
      act(() => {
        result.current.setOpen(true);
      });
      expect(result.current.open).toBe(true);

      // Simulate click inside the ref
      act(() => {
        const refElement = result.current.ref.current;
        if (refElement) {
          refElement.dispatchEvent(new MouseEvent("mousedown", {
            bubbles: true,
            target: refElement,
          }));
        }
      });

      // Should still be open
      expect(result.current.open).toBe(true);
    });

    it("does not add event listener when closed", () => {
      const addEventListenerSpy = vi.spyOn(document, "addEventListener");

      const { result } = renderHook(() => useDropdown());

      // Only one call for initial render (no listener yet)
      act(() => {
        result.current.setOpen(false);
      });

      // Should not add mousedown listener when closed
      const mousedownListeners = addEventListenerSpy.mock.calls.filter(
        ([event]) => event === "mousedown"
      );
      expect(mousedownListeners.length).toBe(0);

      addEventListenerSpy.mockRestore();
    });
  });

  describe("Toggle behavior", () => {
    it("toggles from closed to open", () => {
      const { result } = renderHook(() => useDropdown());

      expect(result.current.open).toBe(false);

      act(() => {
        result.current.setOpen(true);
      });

      expect(result.current.open).toBe(true);
    });

    it("toggles from open to closed", () => {
      const { result } = renderHook(() => useDropdown());

      act(() => {
        result.current.setOpen(true);
      });
      expect(result.current.open).toBe(true);

      act(() => {
        result.current.setOpen(false);
      });

      expect(result.current.open).toBe(false);
    });
  });
});
