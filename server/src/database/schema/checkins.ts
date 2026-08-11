import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  doublePrecision,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boardStatus,
  checkinDirection,
  checkinMethod,
  checkinSource,
  checkinStatus,
  checkinCorrectionAction,
  registrationStatus,
  registrationSource,
} from "./enums";
import { users } from "./users";
import { workspaces } from "./workspaces";
import { events, eventSessions, attendeeFieldDefinitions, consentPolicies } from "./events";

// ============================================================
// Board
// ============================================================
export const boards = pgTable(
  "boards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    code: text("code"),
    locationName: text("location_name"),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    sessionId: uuid("session_id").references(() => eventSessions.id, {
      onDelete: "cascade",
    }),
    status: boardStatus("status").notNull().default("ACTIVE"),
    checkinCount: integer("checkin_count").notNull().default(0),
    lastCheckinAt: timestamp("last_checkin_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventStatusIdx: index("boards_event_status_idx").on(table.eventId, table.status),
    sessionStatusIdx: index("boards_session_status_idx").on(table.sessionId, table.status),
  }),
);

// ============================================================
// Checkin Record
// ============================================================
export const checkinRecords = pgTable(
  "checkin_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    sessionId: uuid("session_id").references(() => eventSessions.id),
    boardId: uuid("board_id").references(() => boards.id),
    direction: checkinDirection("direction").notNull().default("IN"),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    method: checkinMethod("method").notNull().default("QR_SCAN"),
    source: checkinSource("source").notNull().default("PERSONAL_QR"),
    status: checkinStatus("status").notNull().default("VALID"),
    scannedById: uuid("scanned_by_id").references(() => users.id),
    deviceId: text("device_id"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    idemIdx: uniqueIndex("checkin_records_idempotency_key_unique").on(table.idempotencyKey),
    userEventIdx: index("checkin_records_user_event_idx").on(table.userId, table.eventId),
    eventBoardIdx: index("checkin_records_event_board_idx").on(table.eventId, table.boardId),
    workspaceEventTimeIdx: index("checkin_records_workspace_event_time_idx").on(
      table.workspaceId,
      table.eventId,
      table.timestamp,
    ),
    eventSessionIdx: index("checkin_records_event_session_idx").on(
      table.eventId,
      table.sessionId,
    ),
    boardTimeIdx: index("checkin_records_board_time_idx").on(table.boardId, table.timestamp),
  }),
);

// ============================================================
// Checkin Correction
// ============================================================
export const checkinCorrections = pgTable(
  "checkin_corrections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    checkinId: uuid("checkin_id")
      .notNull()
      .references(() => checkinRecords.id, { onDelete: "cascade" }),
    action: checkinCorrectionAction("action").notNull(),
    reason: text("reason").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdById: uuid("created_by_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    checkinIdx: index("checkin_corrections_checkin_idx").on(table.checkinId),
  }),
);

// ============================================================
// Event Registration
// ============================================================
export const eventRegistrations = pgTable(
  "event_registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id),
    status: registrationStatus("status").notNull().default("APPROVED"),
    source: registrationSource("source").notNull().default("SELF_JOIN"),
    approvedById: uuid("approved_by_id"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    rejectedReason: text("rejected_reason"),
    waitlistPosition: integer("waitlist_position"),
    registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  },
  (table) => ({
    uniqueReg: uniqueIndex("event_registrations_user_event_unique").on(
      table.userId,
      table.eventId,
    ),
    eventStatusIdx: index("event_registrations_event_status_idx").on(
      table.eventId,
      table.status,
    ),
  }),
);

// ============================================================
// Registration Field Value
// ============================================================
export const registrationFieldValues = pgTable(
  "registration_field_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => eventRegistrations.id, { onDelete: "cascade" }),
    fieldId: uuid("field_id")
      .notNull()
      .references((): AnyPgColumn => attendeeFieldDefinitions.id),
    valueText: text("value_text"),
    valueNumber: doublePrecision("value_number"),
    valueDate: timestamp("value_date", { withTimezone: true }),
    valueJson: jsonb("value_json"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueRegField: uniqueIndex("registration_field_values_reg_field_unique").on(
      table.registrationId,
      table.fieldId,
    ),
  }),
);

// ============================================================
// Registration Consent
// ============================================================
export const registrationConsents = pgTable(
  "registration_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => eventRegistrations.id, { onDelete: "cascade" }),
    policyId: uuid("policy_id")
      .notNull()
      .references((): AnyPgColumn => consentPolicies.id),
    accepted: boolean("accepted").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ipAddress: text("ip_address"),
  },
  (table) => ({
    uniqueRegPolicy: uniqueIndex("registration_consents_reg_policy_unique").on(
      table.registrationId,
      table.policyId,
    ),
  }),
);

// ============================================================
// Attendance Proof
// ============================================================
export const attendanceProofs = pgTable(
  "attendance_proofs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => eventRegistrations.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    proofCode: text("proof_code").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
  },
  (table) => ({
    proofCodeIdx: uniqueIndex("attendance_proofs_proof_code_unique").on(table.proofCode),
    eventUserIdx: index("attendance_proofs_event_user_idx").on(table.eventId, table.userId),
  }),
);

// ============================================================
// Relations
// ============================================================
export const boardsRelations = relations(boards, ({ one, many }) => ({
  event: one(events, {
    fields: [boards.eventId],
    references: [events.id],
  }),
  session: one(eventSessions, {
    fields: [boards.sessionId],
    references: [eventSessions.id],
  }),
  checkins: many(checkinRecords),
}));

export const checkinRecordsRelations = relations(checkinRecords, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [checkinRecords.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [checkinRecords.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [checkinRecords.eventId],
    references: [events.id],
  }),
  session: one(eventSessions, {
    fields: [checkinRecords.sessionId],
    references: [eventSessions.id],
  }),
  board: one(boards, {
    fields: [checkinRecords.boardId],
    references: [boards.id],
  }),
  scannedBy: one(users, {
    fields: [checkinRecords.scannedById],
    references: [users.id],
    relationName: "CheckinScanner",
  }),
  corrections: many(checkinCorrections),
}));

export const checkinCorrectionsRelations = relations(checkinCorrections, ({ one }) => ({
  checkin: one(checkinRecords, {
    fields: [checkinCorrections.checkinId],
    references: [checkinRecords.id],
  }),
}));

export const eventRegistrationsRelations = relations(eventRegistrations, ({ one, many }) => ({
  user: one(users, {
    fields: [eventRegistrations.userId],
    references: [users.id],
  }),
  event: one(events, {
    fields: [eventRegistrations.eventId],
    references: [events.id],
  }),
  fieldValues: many(registrationFieldValues),
  consents: many(registrationConsents),
  attendanceProofs: many(attendanceProofs),
}));

export const registrationFieldValuesRelations = relations(registrationFieldValues, ({ one }) => ({
  registration: one(eventRegistrations, {
    fields: [registrationFieldValues.registrationId],
    references: [eventRegistrations.id],
  }),
  field: one(attendeeFieldDefinitions, {
    fields: [registrationFieldValues.fieldId],
    references: [attendeeFieldDefinitions.id],
  }),
}));

export const registrationConsentsRelations = relations(registrationConsents, ({ one }) => ({
  registration: one(eventRegistrations, {
    fields: [registrationConsents.registrationId],
    references: [eventRegistrations.id],
  }),
  policy: one(consentPolicies, {
    fields: [registrationConsents.policyId],
    references: [consentPolicies.id],
  }),
}));

export const attendanceProofsRelations = relations(attendanceProofs, ({ one }) => ({
  registration: one(eventRegistrations, {
    fields: [attendanceProofs.registrationId],
    references: [eventRegistrations.id],
  }),
  event: one(events, {
    fields: [attendanceProofs.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [attendanceProofs.userId],
    references: [users.id],
  }),
}));

export type Board = typeof boards.$inferSelect;
export type CheckinRecord = typeof checkinRecords.$inferSelect;
export type EventRegistration = typeof eventRegistrations.$inferSelect;
