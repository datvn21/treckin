import "@testing-library/jest-dom";
import "@/i18n";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// ── Clean up DOM after each test ──
afterEach(() => {
  cleanup();
});

// ── Mock import.meta.env ──
vi.stubGlobal("import", {
  meta: {
    env: {
      VITE_API_URL: "http://localhost:4000/api",
      VITE_GOOGLE_CLIENT_ID: "test-google-client-id",
      VITE_WS_URL: "ws://localhost:4000",
      MODE: "test",
      DEV: true,
      PROD: false,
    },
  },
});

// ── Mock window.matchMedia ──
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ── Mock IntersectionObserver ──
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// ── Mock navigator.onLine ──
Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: true,
});
