import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useQRStore } from "@/stores/qr-store";

// Mock the api module to prevent real HTTP calls
vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

describe("qr-store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useQRStore.getState().reset();
  });

  afterEach(() => {
    useQRStore.getState().stopCountdown();
    vi.useRealTimers();
  });

  it("has correct initial state", () => {
    const state = useQRStore.getState();
    expect(state.currentHash).toBeNull();
    expect(state.timeRemaining).toBe(30);
    expect(state.isRefreshing).toBe(false);
    expect(state.eventId).toBeNull();
    expect(state.error).toBeNull();
    expect(state.expiresAt).toBeNull();
  });

  it("setEventId() updates eventId", () => {
    useQRStore.getState().setEventId("event-42");
    expect(useQRStore.getState().eventId).toBe("event-42");
  });

  it("reset() clears state and stops countdown", () => {
    // Set some state
    useQRStore.setState({
      currentHash: "some-hash",
      eventId: "event-1",
      timeRemaining: 15,
      isRefreshing: true,
      error: "some error",
    });

    useQRStore.getState().reset();

    const state = useQRStore.getState();
    expect(state.currentHash).toBeNull();
    expect(state.expiresAt).toBeNull();
    expect(state.timeRemaining).toBe(30);
    expect(state.isRefreshing).toBe(false);
    expect(state.eventId).toBeNull();
    expect(state.error).toBeNull();
  });

  it("startCountdown() decrements timeRemaining every second", () => {
    useQRStore.setState({ timeRemaining: 30, eventId: "event-1" });

    useQRStore.getState().startCountdown();

    // Advance 3 seconds
    vi.advanceTimersByTime(3000);

    expect(useQRStore.getState().timeRemaining).toBe(27);
  });

  it("stopCountdown() halts the countdown", () => {
    useQRStore.setState({ timeRemaining: 20, eventId: "event-1" });

    useQRStore.getState().startCountdown();
    vi.advanceTimersByTime(2000);
    expect(useQRStore.getState().timeRemaining).toBe(18);

    useQRStore.getState().stopCountdown();
    vi.advanceTimersByTime(5000);
    // Should stay at 18 after stopping
    expect(useQRStore.getState().timeRemaining).toBe(18);
  });

  it("refreshQR() sets isRefreshing and handles API response", async () => {
    const { api } = await import("@/lib/api");
    const mockPost = vi.mocked(api.post);

    mockPost.mockResolvedValueOnce({
      data: {
        hash: "new-hash-abc",
        expiresAt: Date.now() + 30_000,
        ttl: 30,
      },
    });

    const promise = useQRStore.getState().refreshQR("event-1");

    // isRefreshing should be true immediately
    expect(useQRStore.getState().isRefreshing).toBe(true);

    await promise;

    const state = useQRStore.getState();
    expect(state.currentHash).toBe("new-hash-abc");
    expect(state.timeRemaining).toBe(30);
    expect(state.isRefreshing).toBe(false);
    expect(state.error).toBeNull();
  });

  it("refreshQR() sets error on API failure", async () => {
    const { api } = await import("@/lib/api");
    const mockPost = vi.mocked(api.post);

    mockPost.mockRejectedValueOnce(new Error("Network error"));

    await useQRStore.getState().refreshQR("event-1");

    const state = useQRStore.getState();
    expect(state.isRefreshing).toBe(false);
    expect(state.error).toBe("Không thể tạo mã QR. Vui lòng thử lại.");
  });
});
