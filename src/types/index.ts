/* ═══════════════════════════════════════════════════════════════════
   Core TypeScript Interfaces — Treckin
   ═══════════════════════════════════════════════════════════════════ */

// ─── User & Auth ───
export type UserRole = "user" | "admin";

export interface User {
  id: string;
  email: string;
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
export type AttendancePolicy = "SINGLE_IN" | "IN_OUT" | "BOARD_REQUIREMENTS";
export type CheckinMode = "ATTENDEE_CREDENTIAL" | "BOARD_QR";
export type EventQrBehavior = "JOIN_ONLY" | "JOIN_AND_CHECKIN";

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
  attendancePolicy?: AttendancePolicy;
  requiredBoardCount?: number | null;
  checkinModes?: CheckinMode[];
  eventQrBehavior?: EventQrBehavior;
  customSessionsEnabled?: boolean;
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
export type CheckinDirection = "IN" | "OUT";
export type CheckinSource = "PERSONAL_QR" | "BOARD_QR" | "MANUAL" | "OFFLINE_SYNC";

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
  eventId: string;
  boardId: string;
  boardName: string;
  sessionId?: string | null;
  sessionName?: string | null;
  outsideSession?: boolean;
  direction?: CheckinDirection;
  timestamp: string;
  method: CheckinMethod;
}

export interface ScanResult {
  status: ScanStatus;
  student?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string;
  };
  checkinRecord?: CheckinRecord;
  attendance?: {
    policy: AttendancePolicy;
    completed: boolean;
    completedBoardCount?: number;
    requiredBoardCount?: number;
  };
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
  /** 6-character alphanumeric short code displayed below the QR for fallback entry */
  shortCode: string;
}

// ─── Offline Sync ───
export interface OfflineCheckin {
  hash: string;
  scannedAt: string;
  boardId: string;
  direction?: CheckinDirection;
}

export interface BulkSyncResult {
  synced: number;
  skipped: number;
  errors: number;
  details: Array<{
    hash: string;
    userId: string;
    eventId: string;
    status: "synced" | "skipped" | "error";
    reason?: string;
  }>;
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
