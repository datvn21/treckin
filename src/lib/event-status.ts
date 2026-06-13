import type { EventStatus } from "@/types";

export function mapApiEventStatus(status?: string | null): EventStatus {
  switch (status?.toUpperCase()) {
    case "ONGOING":
      return "active";
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    default:
      return "upcoming";
  }
}

export function isApiEventOngoing(status?: string | null) {
  return status?.toUpperCase() === "ONGOING";
}
