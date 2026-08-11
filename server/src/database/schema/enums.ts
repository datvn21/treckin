import { pgEnum } from "drizzle-orm/pg-core";

// ============================================================
// Enums — must mirror the legacy Prisma schema (now deprecated)
// ============================================================

export const userRole = pgEnum("user_role", ["USER", "ADMIN"]);
export const USER_ROLE_VALUES = ["USER", "ADMIN"] as const;

export const eventStatus = pgEnum("event_status", [
  "DRAFT",
  "PENDING_APPROVAL",
  "PUBLISHED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
]);
export const EVENT_STATUS_VALUES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "PUBLISHED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
] as const;

export const boardStatus = pgEnum("board_status", ["ACTIVE", "INACTIVE", "CLOSED"]);
export const BOARD_STATUS_VALUES = ["ACTIVE", "INACTIVE", "CLOSED"] as const;

export const checkinMethod = pgEnum("checkin_method", ["QR_SCAN", "MANUAL", "BULK_SYNC"]);
export const CHECKIN_METHOD_VALUES = ["QR_SCAN", "MANUAL", "BULK_SYNC"] as const;

export const attendancePolicy = pgEnum("attendance_policy", [
  "SINGLE_IN",
  "IN_OUT",
  "BOARD_REQUIREMENTS",
]);
export const ATTENDANCE_POLICY_VALUES = ["SINGLE_IN", "IN_OUT", "BOARD_REQUIREMENTS"] as const;

export const checkinDirection = pgEnum("checkin_direction", ["IN", "OUT"]);
export const CHECKIN_DIRECTION_VALUES = ["IN", "OUT"] as const;

export const checkinSource = pgEnum("checkin_source", [
  "PERSONAL_QR",
  "BOARD_QR",
  "SHORT_CODE",
  "MANUAL",
  "KIOSK",
  "CSV_IMPORT",
  "OFFLINE_SYNC",
]);
export const CHECKIN_SOURCE_VALUES = [
  "PERSONAL_QR",
  "BOARD_QR",
  "SHORT_CODE",
  "MANUAL",
  "KIOSK",
  "CSV_IMPORT",
  "OFFLINE_SYNC",
] as const;

export const checkinMode = pgEnum("checkin_mode", ["ATTENDEE_CREDENTIAL", "BOARD_QR"]);
export const CHECKIN_MODE_VALUES = ["ATTENDEE_CREDENTIAL", "BOARD_QR"] as const;

export const eventQrBehavior = pgEnum("event_qr_behavior", ["JOIN_ONLY", "JOIN_AND_CHECKIN"]);
export const EVENT_QR_BEHAVIOR_VALUES = ["JOIN_ONLY", "JOIN_AND_CHECKIN"] as const;

export const workspaceMemberRole = pgEnum("workspace_member_role", [
  "OWNER",
  "ADMIN",
  "MEMBER",
  "VIEWER",
]);
export const WORKSPACE_MEMBER_ROLE_VALUES = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;

export const invitationStatus = pgEnum("invitation_status", [
  "PENDING",
  "ACCEPTED",
  "REVOKED",
  "EXPIRED",
]);
export const INVITATION_STATUS_VALUES = ["PENDING", "ACCEPTED", "REVOKED", "EXPIRED"] as const;

export const eventAssignmentRole = pgEnum("event_assignment_role", ["MANAGER", "SCANNER"]);
export const EVENT_ASSIGNMENT_ROLE_VALUES = ["MANAGER", "SCANNER"] as const;

export const workspaceStatus = pgEnum("workspace_status", [
  "ACTIVE",
  "SUSPENDED",
  "ARCHIVED",
  "DELETING",
]);
export const WORKSPACE_STATUS_VALUES = ["ACTIVE", "SUSPENDED", "ARCHIVED", "DELETING"] as const;

export const eventVisibility = pgEnum("event_visibility", ["PRIVATE", "WORKSPACE", "PUBLIC_LINK"]);
export const EVENT_VISIBILITY_VALUES = ["PRIVATE", "WORKSPACE", "PUBLIC_LINK"] as const;

export const dataDeletionMode = pgEnum("data_deletion_mode", ["PURGE", "ANONYMIZE"]);
export const DATA_DELETION_MODE_VALUES = ["PURGE", "ANONYMIZE"] as const;

export const eventType = pgEnum("event_type", [
  "SINGLE_SESSION",
  "MULTI_SESSION",
  "OPEN_CHECKIN",
]);
export const EVENT_TYPE_VALUES = ["SINGLE_SESSION", "MULTI_SESSION", "OPEN_CHECKIN"] as const;

export const registrationMode = pgEnum("registration_mode", [
  "CLOSED",
  "INVITE_ONLY",
  "WORKSPACE_MEMBERS",
  "PUBLIC_LINK",
  "APPROVAL_REQUIRED",
]);
export const REGISTRATION_MODE_VALUES = [
  "CLOSED",
  "INVITE_ONLY",
  "WORKSPACE_MEMBERS",
  "PUBLIC_LINK",
  "APPROVAL_REQUIRED",
] as const;

export const waitlistMode = pgEnum("waitlist_mode", ["DISABLED", "AUTO_PROMOTE", "MANUAL"]);
export const WAITLIST_MODE_VALUES = ["DISABLED", "AUTO_PROMOTE", "MANUAL"] as const;

export const sessionStatus = pgEnum("session_status", [
  "DRAFT",
  "SCHEDULED",
  "OPEN",
  "CLOSED",
  "CANCELLED",
]);
export const SESSION_STATUS_VALUES = ["DRAFT", "SCHEDULED", "OPEN", "CLOSED", "CANCELLED"] as const;

export const registrationStatus = pgEnum("registration_status", [
  "PENDING_APPROVAL",
  "APPROVED",
  "WAITLISTED",
  "REJECTED",
  "CANCELLED",
  "CHECKED_IN",
  "NO_SHOW",
]);
export const REGISTRATION_STATUS_VALUES = [
  "PENDING_APPROVAL",
  "APPROVED",
  "WAITLISTED",
  "REJECTED",
  "CANCELLED",
  "CHECKED_IN",
  "NO_SHOW",
] as const;

export const registrationSource = pgEnum("registration_source", [
  "SELF_JOIN",
  "INVITE",
  "IMPORT",
  "ADMIN_ADD",
  "API",
  "WAITLIST_PROMOTION",
]);
export const REGISTRATION_SOURCE_VALUES = [
  "SELF_JOIN",
  "INVITE",
  "IMPORT",
  "ADMIN_ADD",
  "API",
  "WAITLIST_PROMOTION",
] as const;

export const fieldType = pgEnum("field_type", [
  "TEXT",
  "LONG_TEXT",
  "NUMBER",
  "EMAIL",
  "PHONE",
  "DATE",
  "SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
  "FILE",
]);
export const FIELD_TYPE_VALUES = [
  "TEXT",
  "LONG_TEXT",
  "NUMBER",
  "EMAIL",
  "PHONE",
  "DATE",
  "SELECT",
  "MULTI_SELECT",
  "CHECKBOX",
  "FILE",
] as const;

export const checkinStatus = pgEnum("checkin_status", [
  "VALID",
  "VOIDED",
  "CORRECTED",
  "FLAGGED",
]);
export const CHECKIN_STATUS_VALUES = ["VALID", "VOIDED", "CORRECTED", "FLAGGED"] as const;

export const checkinCorrectionAction = pgEnum("checkin_correction_action", [
  "VOID",
  "RESTORE",
  "CHANGE_TIME",
  "CHANGE_BOARD",
  "CHANGE_SESSION",
  "CHANGE_DIRECTION",
]);
export const CHECKIN_CORRECTION_ACTION_VALUES = [
  "VOID",
  "RESTORE",
  "CHANGE_TIME",
  "CHANGE_BOARD",
  "CHANGE_SESSION",
  "CHANGE_DIRECTION",
] as const;

export const jobStatus = pgEnum("job_status", [
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);
export const JOB_STATUS_VALUES = ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"] as const;

export const importType = pgEnum("import_type", ["ATTENDEES", "REGISTRATIONS", "CHECKINS"]);
export const IMPORT_TYPE_VALUES = ["ATTENDEES", "REGISTRATIONS", "CHECKINS"] as const;

export const exportType = pgEnum("export_type", [
  "EVENT_REPORT",
  "ATTENDEE_LIST",
  "CHECKIN_LOG",
  "CERTIFICATES",
  "AUDIT_LOG",
]);
export const EXPORT_TYPE_VALUES = [
  "EVENT_REPORT",
  "ATTENDEE_LIST",
  "CHECKIN_LOG",
  "CERTIFICATES",
  "AUDIT_LOG",
] as const;

export const notificationChannel = pgEnum("notification_channel", [
  "EMAIL",
  "IN_APP",
  "WEBHOOK",
]);
export const NOTIFICATION_CHANNEL_VALUES = ["EMAIL", "IN_APP", "WEBHOOK"] as const;
