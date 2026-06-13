import { describe, it, expect, beforeEach } from "vitest";
import { useScannerStore } from "@/stores/scanner-store";
import type { CheckinRecord, OfflineCheckin } from "@/types";

function makeCheckin(index: number): CheckinRecord {
  return {
    id: `checkin-${index}`,
    userId: `user-${index}`,
    userName: `Student ${index}`,
    eventId: "event-1",
    boardId: "board-1",
    boardName: "Cổng A",
    timestamp: new Date().toISOString(),
    method: "qr",
  };
}

describe("scanner-store", () => {
  beforeEach(() => {
    useScannerStore.getState().reset();
    useScannerStore.getState().clearOfflineQueue();
  });

  it("has correct initial state", () => {
    const state = useScannerStore.getState();
    expect(state.recentCheckins).toEqual([]);
    expect(state.totalCheckins).toBe(0);
    expect(state.scanResult).toBeNull();
    expect(state.offlineQueue).toEqual([]);
    expect(state.isOnline).toBe(true); // mocked in setup.ts
    expect(state.isScanning).toBe(true);
    expect(state.isProcessing).toBe(false);
  });

  it("addCheckin() prepends to recentCheckins and increments totalCheckins", () => {
    const record = makeCheckin(1);
    useScannerStore.getState().addCheckin(record);

    const state = useScannerStore.getState();
    expect(state.recentCheckins).toHaveLength(1);
    expect(state.recentCheckins[0]).toEqual(record);
    expect(state.totalCheckins).toBe(1);
  });

  it("addCheckin() prepends new records (most recent first)", () => {
    const first = makeCheckin(1);
    const second = makeCheckin(2);

    useScannerStore.getState().addCheckin(first);
    useScannerStore.getState().addCheckin(second);

    const state = useScannerStore.getState();
    expect(state.recentCheckins[0]?.id).toBe("checkin-2");
    expect(state.recentCheckins[1]?.id).toBe("checkin-1");
    expect(state.totalCheckins).toBe(2);
  });

  it("addCheckin() caps at MAX_RECENT_CHECKINS (20)", () => {
    // Add 25 checkins — only the last 20 should remain
    for (let i = 1; i <= 25; i++) {
      useScannerStore.getState().addCheckin(makeCheckin(i));
    }

    const state = useScannerStore.getState();
    expect(state.recentCheckins).toHaveLength(20);
    expect(state.totalCheckins).toBe(25);
    // Most recent should be checkin-25, oldest should be checkin-6
    expect(state.recentCheckins[0]?.id).toBe("checkin-25");
    expect(state.recentCheckins[19]?.id).toBe("checkin-6");
  });

  it("queueOffline() adds to offlineQueue", () => {
    const offlineItem: OfflineCheckin = {
      hash: "offline-hash-1",
      scannedAt: new Date().toISOString(),
      boardId: "board-1",
    };

    useScannerStore.getState().queueOffline(offlineItem);

    const state = useScannerStore.getState();
    expect(state.offlineQueue).toHaveLength(1);
    expect(state.offlineQueue[0]).toEqual(offlineItem);
  });

  it("clearOfflineQueue() empties the queue", () => {
    const item: OfflineCheckin = {
      hash: "offline-hash-1",
      scannedAt: new Date().toISOString(),
      boardId: "board-1",
    };

    useScannerStore.getState().queueOffline(item);
    expect(useScannerStore.getState().offlineQueue).toHaveLength(1);

    useScannerStore.getState().clearOfflineQueue();
    expect(useScannerStore.getState().offlineQueue).toEqual([]);
  });

  it("clearResult() sets scanResult to null", () => {
    useScannerStore.getState().setScanResult({
      status: "success",
      message: "Check-in thành công!",
    });
    expect(useScannerStore.getState().scanResult).not.toBeNull();

    useScannerStore.getState().clearResult();
    expect(useScannerStore.getState().scanResult).toBeNull();
  });

  it("reset() returns to initial state", () => {
    // Mutate state
    useScannerStore.getState().addCheckin(makeCheckin(1));
    useScannerStore.getState().setScanResult({
      status: "success",
      message: "OK",
    });
    useScannerStore.getState().queueOffline({
      hash: "h",
      scannedAt: new Date().toISOString(),
      boardId: "b",
    });

    useScannerStore.getState().reset();

    const state = useScannerStore.getState();
    expect(state.currentEvent).toBeNull();
    expect(state.currentBoard).toBeNull();
    expect(state.scanResult).toBeNull();
    expect(state.recentCheckins).toEqual([]);
    expect(state.totalCheckins).toBe(0);
    expect(state.offlineQueue).toHaveLength(1);
    expect(state.offlineQueue[0]).toMatchObject({ hash: "h", boardId: "b" });
    expect(state.isScanning).toBe(true);
    expect(state.isProcessing).toBe(false);
  });
});
