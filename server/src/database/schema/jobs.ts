import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  jobStatus,
  importType,
  exportType,
  notificationChannel,
} from "./enums";
import { users } from "./users";
import { workspaces } from "./workspaces";
import { events } from "./events";

// ============================================================
// Import Job
// ============================================================
export const importJobs = pgTable(
  "import_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    type: importType("type").notNull(),
    status: jobStatus("status").notNull().default("QUEUED"),
    fileUrl: text("file_url").notNull(),
    originalFileName: text("original_file_name"),
    mapping: jsonb("mapping"),
    summary: jsonb("summary"),
    errorLogUrl: text("error_log_url"),
    requestedById: uuid("requested_by_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceCreatedIdx: index("import_jobs_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    eventCreatedIdx: index("import_jobs_event_created_idx").on(table.eventId, table.createdAt),
  }),
);

// ============================================================
// Export Job
// ============================================================
export const exportJobs = pgTable(
  "export_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }),
    type: exportType("type").notNull(),
    status: jobStatus("status").notNull().default("QUEUED"),
    filters: jsonb("filters"),
    fileUrl: text("file_url"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    summary: jsonb("summary"),
    errorMessage: text("error_message"),
    requestedById: uuid("requested_by_id").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceCreatedIdx: index("export_jobs_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    eventCreatedIdx: index("export_jobs_event_created_idx").on(table.eventId, table.createdAt),
  }),
);

// ============================================================
// Notification Preference
// ============================================================
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    channel: notificationChannel("channel").notNull(),
    eventType: text("event_type").notNull(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => ({
    uniquePref: uniqueIndex("notification_preferences_user_workspace_channel_event_unique").on(
      table.userId,
      table.workspaceId,
      table.channel,
      table.eventType,
    ),
  }),
);

// ============================================================
// Webhook Endpoint
// ============================================================
export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    secretHash: text("secret_hash").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    subscribedEvents: text("subscribed_events").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceEnabledIdx: index("webhook_endpoints_workspace_enabled_idx").on(
      table.workspaceId,
      table.enabled,
    ),
  }),
);

// ============================================================
// Relations
// ============================================================
export const importJobsRelations = relations(importJobs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [importJobs.workspaceId],
    references: [workspaces.id],
  }),
  event: one(events, {
    fields: [importJobs.eventId],
    references: [events.id],
  }),
}));

export const exportJobsRelations = relations(exportJobs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [exportJobs.workspaceId],
    references: [workspaces.id],
  }),
  event: one(events, {
    fields: [exportJobs.eventId],
    references: [events.id],
  }),
}));

export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [notificationPreferences.userId],
      references: [users.id],
    }),
    workspace: one(workspaces, {
      fields: [notificationPreferences.workspaceId],
      references: [workspaces.id],
    }),
  }),
);

export const webhookEndpointsRelations = relations(webhookEndpoints, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [webhookEndpoints.workspaceId],
    references: [workspaces.id],
  }),
}));

export type ImportJob = typeof importJobs.$inferSelect;
export type ExportJob = typeof exportJobs.$inferSelect;
export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type WebhookEndpoint = typeof webhookEndpoints.$inferSelect;
