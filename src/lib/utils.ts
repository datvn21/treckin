import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNowStrict } from "date-fns";
import { vi } from "date-fns/locale";

/**
 * Merge Tailwind classes with conflict resolution (Shadcn pattern).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Get the university avatar URL from MSSV (zero-storage pattern).
 * The university hosts official photos at a static URL.
 */
export function getAvatarUrl(mssv: string): string {
  return `https://elit.tdtu.edu.vn/static/img/svimgs/thumbnail/${mssv}.jpg`;
}

/**
 * Extract MSSV (Student ID) from university email.
 * e.g., "52100123@student.tdtu.edu.vn" → "52100123"
 */
export function extractMssv(email: string): string {
  return email.split("@")[0] ?? "";
}

/**
 * Format MSSV for display with spacing.
 * e.g., "52100123" → "521 001 23"
 */
export function formatStudentId(mssv: string): string {
  if (mssv.length <= 3) return mssv;
  return mssv.replace(/(\d{3})(?=\d)/g, "$1 ");
}

/**
 * Format a timestamp to a human-readable time string.
 */
export function formatTime(date: string | Date, pattern = "HH:mm:ss"): string {
  return format(new Date(date), pattern, { locale: vi });
}

/**
 * Format a date to a human-readable date string.
 */
export function formatDate(date: string | Date, pattern = "dd/MM/yyyy"): string {
  return format(new Date(date), pattern, { locale: vi });
}

/**
 * Relative time from now (e.g., "2 giây trước").
 */
export function timeAgo(date: string | Date): string {
  return formatDistanceToNowStrict(new Date(date), {
    addSuffix: true,
    locale: vi,
  });
}

/**
 * Haversine distance between two coordinates in meters.
 * Used for geofencing validation.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if coordinates are within geofence radius.
 */
export function isWithinGeofence(
  userLat: number,
  userLon: number,
  venueLat: number,
  venueLon: number,
  radiusMeters: number
): boolean {
  return haversineDistance(userLat, userLon, venueLat, venueLon) <= radiusMeters;
}

/**
 * Generate a unique ID for offline queue items.
 */
export function generateOfflineId(): string {
  return `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
