import { describe, it, expect } from "vitest";
import {
  cn,
  getAvatarUrl,
  haversineDistance,
  isWithinGeofence,
  generateOfflineId,
} from "../utils";

describe("cn()", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    const result = cn("px-4", "px-6");
    expect(result).toBe("px-6");
  });

  it("handles undefined and null gracefully", () => {
    expect(cn("a", undefined, null, "b")).toBe("a b");
  });

  it("resolves complex Tailwind conflicts", () => {
    const result = cn("text-red-500", "text-blue-500");
    expect(result).toBe("text-blue-500");
  });
});

describe("getAvatarUrl()", () => {
  it("returns a ui-avatars.com URL for a given name", () => {
    const url = getAvatarUrl("Nguyen Van A");
    expect(url).toContain("ui-avatars.com");
    expect(url).toContain("Nguyen");
  });

  it("URL-encodes spaces in names", () => {
    const url = getAvatarUrl("Alice Smith");
    expect(url).toContain("Alice");
  });
});

describe("haversineDistance()", () => {
  it("returns 0 for identical coordinates", () => {
    expect(haversineDistance(10.7329, 106.6997, 10.7329, 106.6997)).toBe(0);
  });

  it("calculates correct distance between known points", () => {
    // Two points ~4.4km apart
    const distance = haversineDistance(10.7329, 106.6997, 10.7725, 106.6981);
    expect(distance).toBeGreaterThan(4000);
    expect(distance).toBeLessThan(5000);
  });

  it("handles antipodal points (half-Earth distance)", () => {
    // North Pole to South Pole ≈ 20,015 km
    const distance = haversineDistance(90, 0, -90, 0);
    expect(distance).toBeGreaterThan(20_000_000);
    expect(distance).toBeLessThan(20_100_000);
  });
});

describe("isWithinGeofence()", () => {
  const venueLat = 10.7329;
  const venueLon = 106.6997;
  const radiusMeters = 500;

  it("returns true when user is within radius", () => {
    // ~100m away from venue
    expect(isWithinGeofence(10.7335, 106.7000, venueLat, venueLon, radiusMeters)).toBe(true);
  });

  it("returns false when user is outside radius", () => {
    // ~4.4km away
    expect(isWithinGeofence(10.7725, 106.6981, venueLat, venueLon, radiusMeters)).toBe(false);
  });

  it("returns true when user is exactly at venue", () => {
    expect(isWithinGeofence(venueLat, venueLon, venueLat, venueLon, radiusMeters)).toBe(true);
  });
});

describe("generateOfflineId()", () => {
  it("returns a string with 'offline_' prefix", () => {
    const id = generateOfflineId();
    expect(id).toMatch(/^offline_/);
  });

  it("generates unique IDs on successive calls", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) {
      ids.add(generateOfflineId());
    }
    expect(ids.size).toBe(50);
  });

  it("contains a timestamp component", () => {
    const before = Date.now();
    const id = generateOfflineId();
    const after = Date.now();

    // Extract timestamp from the ID (offline_{timestamp}_{random})
    const parts = id.split("_");
    const timestamp = Number(parts[1]);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});
