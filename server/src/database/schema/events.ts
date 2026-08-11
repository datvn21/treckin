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
import {
  eventStatus,
  attendancePolicy,
  checkinMode,
  eventQrBehavior,
  eventType,
  registrationMode,
  waitlistMode,
  eventVisibility,
  sessionStatus,
  eventAssignmentRole,
  fieldType,
} from "./enums";
import { users } from "./users";
import { workspaces } from "./workspaces";
import {
  boards,
  checkinRecords,
  eventRegistrations,
  registrationConsents,
  registrationFieldValues,
} from "./checkins";

// ============================================================
// Event
// ============================================================
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    type: eventType("type").notNull().default("SINGLE_SESSION"),
    visibility: eventVisibility("visibility").notNull().default("WORKSPACE"),
    date: timestamp("date", { withTimezone: true }).notNull(),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    timezone: text("timezone"),
    location: text("location").notNull(),
    locationName: text("location_name"),
    locationAddress: text("location_address"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    geofenceRadius: integer("geofence_radius").default(100),
    status: eventStatus("status").notNull().default("DRAFT"),
    capacity: integer("capacity"),
    waitlistMode: waitlistMode("waitlist_mode").notNull().default("DISABLED"),
    registrationMode: registrationMode("registration_mode").notNull().default("WORKSPACE_MEMBERS"),
    registrationOpensAt: timestamp("registration_opens_at", { withTimezone: true }),
    registrationClosesAt: timestamp("registration_closes_at", { withTimezone: true }),
    attendancePolicy: attendancePolicy("attendance_policy").notNull().default("SINGLE_IN"),
    requiredBoardCount: integer("required_board_count"),
    joinCode: text("join_code").notNull(),
    publicSlug: text("public_slug"),
    registrationEnabled: boolean("registration_enabled").notNull().default(true),
    allowedDomains: text("allowed_domains").array().notNull().default([]),
    allowedEmails: text("allowed_emails").array().notNull().default([]),
    blockedEmails: text("blocked_emails").array().notNull().default([]),
    checkinModes: checkinMode("checkin_modes").array().notNull().default([
      "ATTENDEE_CREDENTIAL",
      "BOARD_QR",
    ]),
    eventQrBehavior: eventQrBehavior("event_qr_behavior").notNull().default("JOIN_ONLY"),
    credentialGraceSeconds: integer("credential_grace_seconds").notNull().default(120),
    customSessionsEnabled: boolean("custom_sessions_enabled").notNull().default(false),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    purgeAfter: timestamp("purge_after", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    joinCodeIdx: uniqueIndex("events_join_code_unique").on(table.joinCode),
    workspaceStatusStartsIdx: index("events_workspace_status_starts_idx").on(
      table.workspaceId,
      table.status,
      table.startsAt,
    ),
    workspacePublicSlugIdx: index("events_workspace_public_slug_idx").on(
      table.workspaceId,
      table.publicSlug,
    ),
  }),
);

// ============================================================
// Event Settings
// ============================================================
export const eventSettings = pgTable(
  "event_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    attendancePolicy: attendancePolicy("attendance_policy").notNull().default("SINGLE_IN"),
    requiredBoardCount: integer("required_board_count"),
    checkinModes: checkinMode("checkin_modes").array().notNull().default([
      "ATTENDEE_CREDENTIAL",
      "BOARD_QR",
    ]),
    eventQrBehavior: eventQrBehavior("event_qr_behavior").notNull().default("JOIN_ONLY"),
    qrTtlSeconds: integer("qr_ttl_seconds").notNull().default(30),
    credentialGraceSeconds: integer("credential_grace_seconds").notNull().default(120),
    offlineSyncEnabled: boolean("offline_sync_enabled").notNull().default(true),
    geofenceEnabled: boolean("geofence_enabled").notNull().default(false),
    geofenceRadiusMeters: integer("geofence_radius_meters"),
    manualCheckinEnabled: boolean("manual_checkin_enabled").notNull().default(false),
    manualCorrectionEnabled: boolean("manual_correction_enabled").notNull().default(false),
    requireCorrectionReason: boolean("require_correction_reason").notNull().default(true),
    certificateEnabled: boolean("certificate_enabled").notNull().default(false),
    attendanceProofEnabled: boolean("attendance_proof_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventIdx: uniqueIndex("event_settings_event_id_unique").on(table.eventId),
  }),
);

// ============================================================
// Event Session
// ============================================================
export const eventSessions = pgTable(
  "event_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    locationName: text("location_name"),
    capacity: integer("capacity"),
    status: sessionStatus("status").notNull().default("SCHEDULED"),
    isDefault: boolean("is_default").notNull().default(false),
    checkinOpensAt: timestamp("checkin_opens_at", { withTimezone: true }),
    checkinClosesAt: timestamp("checkin_closes_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    eventStartsIdx: index("event_sessions_event_starts_idx").on(table.eventId, table.startsAt),
    eventDefaultIdx: index("event_sessions_event_default_idx").on(table.eventId, table.isDefault),
  }),
);

// ============================================================
// Event Assignment
// ============================================================
export const eventAssignments = pgTable(
  "event_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: eventAssignmentRole("role").notNull(),
    assignedById: uuid("assigned_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueAssignment: uniqueIndex("event_assignments_event_user_unique").on(
      table.eventId,
      table.userId,
    ),
  }),
);

// ============================================================
// Attendee Field Definition
// ============================================================
export const attendeeFieldDefinitions = pgTable(
  "attendee_field_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    label: text("label").notNull(),
    type: fieldType("type").notNull(),
    required: boolean("required").notNull().default(false),
    options: jsonb("options"),
    validation: jsonb("validation"),
    position: integer("position").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueField: uniqueIndex("attendee_field_definitions_workspace_event_key_unique").on(
      table.workspaceId,
      table.eventId,
      table.key,
    ),
    workspaceEventIdx: index("attendee_field_definitions_workspace_event_idx").on(
      table.workspaceId,
      table.eventId,
    ),
  }),
);

// ============================================================
// Consent Policy
// ============================================================
export const consentPolicies = pgTable(
  "consent_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    version: integer("version").notNull().default(1),
    required: boolean("required").notNull().default(true),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceEventIdx: index("consent_policies_workspace_event_idx").on(
      table.workspaceId,
      table.eventId,
    ),
  }),
);

// ============================================================
// Relations
// ============================================================
export const eventsRelations = relations(events, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [events.workspaceId],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [events.createdById],
    references: [users.id],
    relationName: "EventCreator",
  }),
  settings: one(eventSettings, {
    fields: [events.id],
    references: [eventSettings.eventId],
  }),
  sessions: many(eventSessions),
  boards: many(boards),
  registrations: many(eventRegistrations),
  checkins: many(checkinRecords),
  assignments: many(eventAssignments),
  attendeeFields: many(attendeeFieldDefinitions),
  consentPolicies: many(consentPolicies),
})) as any;

export const eventSettingsRelations = relations(eventSettings, ({ one }) => ({
  event: one(events, {
    fields: [eventSettings.eventId],
    references: [events.id],
  }),
}));

export const eventSessionsRelations = relations(eventSessions, ({ one, many }) => ({
  event: one(events, {
    fields: [eventSessions.eventId],
    references: [events.id],
  }),
  boards: many(boards),
  checkins: many(checkinRecords),
})) as any;

export const eventAssignmentsRelations = relations(eventAssignments, ({ one }) => ({
  event: one(events, {
    fields: [eventAssignments.eventId],
    references: [events.id],
  }),
  user: one(users, {
    fields: [eventAssignments.userId],
    references: [users.id],
  }),
  assignedBy: one(users, {
    fields: [eventAssignments.assignedById],
    references: [users.id],
    relationName: "AssignmentCreator",
  }),
}));

export const attendeeFieldDefinitionsRelations = relations(
  attendeeFieldDefinitions,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [attendeeFieldDefinitions.workspaceId],
      references: [workspaces.id],
    }),
    event: one(events, {
      fields: [attendeeFieldDefinitions.eventId],
      references: [events.id],
    }),
    values: many(registrationFieldValues),
  }),
) as any;

export const consentPoliciesRelations = relations(consentPolicies, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [consentPolicies.workspaceId],
    references: [workspaces.id],
  }),
  event: one(events, {
    fields: [consentPolicies.eventId],
    references: [events.id],
  }),
  consents: many(registrationConsents),
})) as any;

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventSettings = typeof eventSettings.$inferSelect;
export type EventSession = typeof eventSessions.$inferSelect;
export type EventAssignment = typeof eventAssignments.$inferSelect;
export type AttendeeFieldDefinition = typeof attendeeFieldDefinitions.$inferSelect;
export type ConsentPolicy = typeof consentPolicies.$inferSelect;
