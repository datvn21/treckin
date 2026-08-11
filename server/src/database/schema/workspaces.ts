import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  bigint,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  workspaceStatus,
  dataDeletionMode,
  eventVisibility,
  workspaceMemberRole,
  invitationStatus,
} from "./enums";
import { users } from "./users";

// ============================================================
// Workspace
// ============================================================
export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug"),
    name: text("name").notNull(),
    description: text("description"),
    logoUrl: text("logo_url"),
    timezone: text("timezone").notNull().default("UTC"),
    locale: text("locale").notNull().default("en"),
    status: workspaceStatus("status").notNull().default("ACTIVE"),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    purgeAfter: timestamp("purge_after", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex("workspaces_slug_unique").on(table.slug),
  }),
);

// ============================================================
// Workspace Settings
// ============================================================
export const workspaceSettings = pgTable(
  "workspace_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    defaultRetentionDays: integer("default_retention_days").notNull().default(30),
    allowPublicEventJoin: boolean("allow_public_event_join").notNull().default(false),
    requireEmailVerification: boolean("require_email_verification").notNull().default(true),
    allowMemberEventView: boolean("allow_member_event_view").notNull().default(true),
    allowViewerReports: boolean("allow_viewer_reports").notNull().default(false),
    defaultEventVisibility: eventVisibility("default_event_visibility")
      .notNull()
      .default("WORKSPACE"),
    defaultQrTtlSeconds: integer("default_qr_ttl_seconds").notNull().default(30),
    defaultOfflineGraceSeconds: integer("default_offline_grace_seconds").notNull().default(120),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: uniqueIndex("workspace_settings_workspace_id_unique").on(table.workspaceId),
  }),
);

// ============================================================
// Workspace Policy
// ============================================================
export const workspacePolicies = pgTable(
  "workspace_policies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    memberCanCreateEvents: boolean("member_can_create_events").notNull().default(false),
    eventManagerCanInviteScanner: boolean("event_manager_can_invite_scanner")
      .notNull()
      .default(true),
    eventManagerCanExportReports: boolean("event_manager_can_export_reports")
      .notNull()
      .default(true),
    scannerCanSeeAttendeeList: boolean("scanner_can_see_attendee_list").notNull().default(false),
    scannerCanManualCheckin: boolean("scanner_can_manual_checkin").notNull().default(false),
    viewerCanExportReports: boolean("viewer_can_export_reports").notNull().default(false),
    requireApprovalForEvents: boolean("require_approval_for_events").notNull().default(false),
    requireApprovalForImports: boolean("require_approval_for_imports").notNull().default(false),
    requireReasonForManualEdit: boolean("require_reason_for_manual_edit")
      .notNull()
      .default(true),
    dataDeletionMode: dataDeletionMode("data_deletion_mode").notNull().default("ANONYMIZE"),
    retentionDays: integer("retention_days").notNull().default(30),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: uniqueIndex("workspace_policies_workspace_id_unique").on(table.workspaceId),
  }),
);

// ============================================================
// Workspace Usage
// ============================================================
export const workspaceUsage = pgTable(
  "workspace_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    planKey: text("plan_key").notNull().default("free_internal"),
    maxMembers: integer("max_members"),
    maxEvents: integer("max_events"),
    maxAttendees: integer("max_attendees"),
    maxMonthlyCheckins: integer("max_monthly_checkins"),
    storageBytes: bigint("storage_bytes", { mode: "bigint" }).notNull(),
    monthlyCheckins: integer("monthly_checkins").notNull().default(0),
    monthlyExports: integer("monthly_exports").notNull().default(0),
    periodStartedAt: timestamp("period_started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    periodEndsAt: timestamp("period_ends_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: uniqueIndex("workspace_usage_workspace_id_unique").on(table.workspaceId),
  }),
);

// ============================================================
// Workspace Member
// ============================================================
export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceMemberRole("role").notNull().default("MEMBER"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueMember: uniqueIndex("workspace_members_workspace_user_unique").on(
      table.workspaceId,
      table.userId,
    ),
  }),
);

// ============================================================
// Workspace Invitation
// ============================================================
export const workspaceInvitations = pgTable(
  "workspace_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    token: text("token").notNull(),
    status: invitationStatus("status").notNull().default("PENDING"),
    metadata: jsonb("metadata"),
    invitedById: uuid("invited_by_id")
      .notNull()
      .references(() => users.id),
    acceptedById: uuid("accepted_by_id"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenIdx: uniqueIndex("workspace_invitations_token_unique").on(table.token),
    workspaceEmailIdx: index("workspace_invitations_workspace_email_idx").on(
      table.workspaceId,
      table.email,
    ),
  }),
);

// ============================================================
// Audit Log
// ============================================================
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id"),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    before: jsonb("before"),
    after: jsonb("after"),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceCreatedIdx: index("audit_logs_workspace_created_idx").on(
      table.workspaceId,
      table.createdAt,
    ),
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  }),
);

// ============================================================
// Relations
// ============================================================
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [workspaces.createdById],
    references: [users.id],
    relationName: "WorkspaceCreator",
  }),
  settings: one(workspaceSettings, {
    fields: [workspaces.id],
    references: [workspaceSettings.workspaceId],
  }),
  policy: one(workspacePolicies, {
    fields: [workspaces.id],
    references: [workspacePolicies.workspaceId],
  }),
  usage: one(workspaceUsage, {
    fields: [workspaces.id],
    references: [workspaceUsage.workspaceId],
  }),
  members: many(workspaceMembers),
  invitations: many(workspaceInvitations),
  auditLogs: many(auditLogs),
}) as any);

export const workspaceSettingsRelations = relations(workspaceSettings, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceSettings.workspaceId],
    references: [workspaces.id],
  }),
}));

export const workspacePoliciesRelations = relations(workspacePolicies, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspacePolicies.workspaceId],
    references: [workspaces.id],
  }),
}));

export const workspaceUsageRelations = relations(workspaceUsage, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceUsage.workspaceId],
    references: [workspaces.id],
  }),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}));

export const workspaceInvitationsRelations = relations(workspaceInvitations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceInvitations.workspaceId],
    references: [workspaces.id],
  }),
  invitedBy: one(users, {
    fields: [workspaceInvitations.invitedById],
    references: [users.id],
    relationName: "InvitationSender",
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [auditLogs.workspaceId],
    references: [workspaces.id],
  }),
}));

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceSettings = typeof workspaceSettings.$inferSelect;
export type WorkspacePolicy = typeof workspacePolicies.$inferSelect;
export type WorkspaceUsage = typeof workspaceUsage.$inferSelect;
export type WorkspaceMember = typeof workspaceMembers.$inferSelect;
export type WorkspaceInvitation = typeof workspaceInvitations.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
