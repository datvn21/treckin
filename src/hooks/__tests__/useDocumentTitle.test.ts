import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@/test/test-utils";
import { useDocumentTitle } from "../useDocumentTitle";

describe("useDocumentTitle", () => {
  const originalTitle = document.title;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    document.title = originalTitle;
    vi.useRealTimers();
  });

  describe("Initial behavior", () => {
    it("sets title to 'Treckin' when no title is provided", () => {
      renderHook(() => useDocumentTitle());

      act(() => {
        vi.runAllTimers();
      });

      expect(document.title).toBe("Treckin");
    });

    it("sets title with suffix when title is provided", () => {
      renderHook(() => useDocumentTitle("Dashboard"));

      act(() => {
        vi.runAllTimers();
      });

      expect(document.title).toBe("Dashboard · Treckin");
    });
  });

  describe("Title updates", () => {
    it("updates title when title prop changes", () => {
      const { rerender } = renderHook(({ title }: { title?: string }) => useDocumentTitle(title), {
        initialProps: { title: undefined as string | undefined },
      });

      act(() => {
        vi.runAllTimers();
      });
      expect(document.title).toBe("Treckin");

      rerender({ title: "New Page" });

      act(() => {
        vi.runAllTimers();
      });
      expect(document.title).toBe("New Page · Treckin");
    });

    it("removes custom title when set to undefined", () => {
      const { rerender } = renderHook(({ title }: { title?: string }) => useDocumentTitle(title), {
        initialProps: { title: "Event Details" },
      });

      act(() => {
        vi.runAllTimers();
      });
      expect(document.title).toBe("Event Details · Treckin");

      rerender({ title: undefined });

      act(() => {
        vi.runAllTimers();
      });
      expect(document.title).toBe("Treckin");
    });
  });

  describe("Title formatting", () => {
    it("handles empty string title", () => {
      renderHook(() => useDocumentTitle(""));

      act(() => {
        vi.runAllTimers();
      });

      expect(document.title).toBe(" · Treckin");
    });

    it("handles special characters in title", () => {
      renderHook(() => useDocumentTitle("Event: Test & Demo <2024>"));

      act(() => {
        vi.runAllTimers();
      });

      expect(document.title).toBe("Event: Test & Demo <2024> · Treckin");
    });
  });
});
