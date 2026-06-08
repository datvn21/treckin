/* ═══════════════════════════════════════════════════════════════════
   Core TypeScript Interfaces — Smart Check-in System
   ═══════════════════════════════════════════════════════════════════ */

// ─── User & Auth ───
export type UserRole = "student" | "staff" | "admin";

export interface User {
  id: string;
  email: string;
  mssv: string;
  name: string;
  role: UserRole;
  avatarUrl: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// ─── Events ───
export type EventStatus = "upcoming" | "active" | "completed" | "cancelled";

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  latitude?: number;
  longitude?: number;
  geofenceRadius?: number;
  status: EventStatus;
  boards: Board[];
  totalCheckins: number;
  totalRegistered: number;
  createdBy: string;
  createdAt: string;
}

export interface EventSummary {
  id: string;
  title: string;
  date: string;
  startTime: string;
  location: string;
  status: EventStatus;
  totalCheckins: number;
  totalRegistered: number;
  boardCount: number;
}

// ─── Boards ───
export type BoardStatus = "active" | "paused" | "closed";

export interface Board {
  id: string;
  name: string;
  eventId: string;
  status: BoardStatus;
  checkinCount: number;
}

// ─── Check-in Records ───
export type CheckinMethod = "qr" | "manual" | "offline-sync";

export type ScanStatus =
  | "success"
  | "already-checked-in"
  | "invalid-qr"
  | "expired-qr"
  | "race-condition"
  | "outside-geofence";

export interface CheckinRecord {
  id: string;
  userId: string;
  userName: string;
  userMssv: string;
  eventId: string;
  boardId: string;
  boardName: string;
  timestamp: string;
  method: CheckinMethod;
}

export interface ScanResult {
  status: ScanStatus;
  student?: {
    id: string;
    name: string;
    mssv: string;
    avatarUrl: string;
  };
  checkinRecord?: CheckinRecord;
  message: string;
  originalCheckin?: {
    boardName: string;
    timestamp: string;
  };
}

// ─── QR Code ───
export interface QRPayload {
  hash: string;
  userId: string;
  eventId: string;
  expiresAt: number;
}

export interface QRGenerateResponse {
  hash: string;
  expiresAt: number;
  ttl: number;
}

// ─── Offline Sync ───
export interface OfflineCheckin {
  hash: string;
  scannedAt: string;
  boardId: string;
}

export interface BulkSyncResult {
  synced: number;
  skipped: number;
  errors: Array<{ hash: string; reason: string }>;
}

// ─── Socket.io Events ───
export enum SocketEvent {
  CHECKIN_SUCCESS = "checkin:success",
  BOARD_SYNC = "board:sync",
  QR_INVALIDATED = "qr:invalidated",
  JOIN_EVENT = "event:join",
  LEAVE_EVENT = "event:leave",
  BOARD_STATUS_CHANGE = "board:status",
}

export interface SocketCheckinPayload {
  checkinRecord: CheckinRecord;
  eventId: string;
  totalCheckins: number;
}
