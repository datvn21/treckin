CREATE TYPE "public"."attendance_policy" AS ENUM('SINGLE_IN', 'IN_OUT', 'BOARD_REQUIREMENTS');--> statement-breakpoint
CREATE TYPE "public"."board_status" AS ENUM('ACTIVE', 'INACTIVE', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."checkin_correction_action" AS ENUM('VOID', 'RESTORE', 'CHANGE_TIME', 'CHANGE_BOARD', 'CHANGE_SESSION', 'CHANGE_DIRECTION');--> statement-breakpoint
CREATE TYPE "public"."checkin_direction" AS ENUM('IN', 'OUT');--> statement-breakpoint
CREATE TYPE "public"."checkin_method" AS ENUM('QR_SCAN', 'MANUAL', 'BULK_SYNC');--> statement-breakpoint
CREATE TYPE "public"."checkin_mode" AS ENUM('ATTENDEE_CREDENTIAL', 'BOARD_QR');--> statement-breakpoint
CREATE TYPE "public"."checkin_source" AS ENUM('PERSONAL_QR', 'BOARD_QR', 'SHORT_CODE', 'MANUAL', 'KIOSK', 'CSV_IMPORT', 'OFFLINE_SYNC');--> statement-breakpoint
CREATE TYPE "public"."checkin_status" AS ENUM('VALID', 'VOIDED', 'CORRECTED', 'FLAGGED');--> statement-breakpoint
CREATE TYPE "public"."data_deletion_mode" AS ENUM('PURGE', 'ANONYMIZE');--> statement-breakpoint
CREATE TYPE "public"."event_assignment_role" AS ENUM('MANAGER', 'SCANNER');--> statement-breakpoint
CREATE TYPE "public"."event_qr_behavior" AS ENUM('JOIN_ONLY', 'JOIN_AND_CHECKIN');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('DRAFT', 'PENDING_APPROVAL', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('SINGLE_SESSION', 'MULTI_SESSION', 'OPEN_CHECKIN');--> statement-breakpoint
CREATE TYPE "public"."event_visibility" AS ENUM('PRIVATE', 'WORKSPACE', 'PUBLIC_LINK');--> statement-breakpoint
CREATE TYPE "public"."export_type" AS ENUM('EVENT_REPORT', 'ATTENDEE_LIST', 'CHECKIN_LOG', 'CERTIFICATES', 'AUDIT_LOG');--> statement-breakpoint
CREATE TYPE "public"."field_type" AS ENUM('TEXT', 'LONG_TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'SELECT', 'MULTI_SELECT', 'CHECKBOX', 'FILE');--> statement-breakpoint
CREATE TYPE "public"."import_type" AS ENUM('ATTENDEES', 'REGISTRATIONS', 'CHECKINS');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('EMAIL', 'IN_APP', 'WEBHOOK');--> statement-breakpoint
CREATE TYPE "public"."registration_mode" AS ENUM('CLOSED', 'INVITE_ONLY', 'WORKSPACE_MEMBERS', 'PUBLIC_LINK', 'APPROVAL_REQUIRED');--> statement-breakpoint
CREATE TYPE "public"."registration_source" AS ENUM('SELF_JOIN', 'INVITE', 'IMPORT', 'ADMIN_ADD', 'API', 'WAITLIST_PROMOTION');--> statement-breakpoint
CREATE TYPE "public"."registration_status" AS ENUM('PENDING_APPROVAL', 'APPROVED', 'WAITLISTED', 'REJECTED', 'CANCELLED', 'CHECKED_IN', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."waitlist_mode" AS ENUM('DISABLED', 'AUTO_PROMOTE', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."workspace_member_role" AS ENUM('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."workspace_status" AS ENUM('ACTIVE', 'SUSPENDED', 'ARCHIVED', 'DELETING');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"avatar_url" text,
	"password_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"before" jsonb,
	"after" jsonb,
	"metadata" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"email" text NOT NULL,
	"token" text NOT NULL,
	"status" "invitation_status" DEFAULT 'PENDING' NOT NULL,
	"metadata" jsonb,
	"invited_by_id" uuid NOT NULL,
	"accepted_by_id" uuid,
	"accepted_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "workspace_member_role" DEFAULT 'MEMBER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"member_can_create_events" boolean DEFAULT false NOT NULL,
	"event_manager_can_invite_scanner" boolean DEFAULT true NOT NULL,
	"event_manager_can_export_reports" boolean DEFAULT true NOT NULL,
	"scanner_can_see_attendee_list" boolean DEFAULT false NOT NULL,
	"scanner_can_manual_checkin" boolean DEFAULT false NOT NULL,
	"viewer_can_export_reports" boolean DEFAULT false NOT NULL,
	"require_approval_for_events" boolean DEFAULT false NOT NULL,
	"require_approval_for_imports" boolean DEFAULT false NOT NULL,
	"require_reason_for_manual_edit" boolean DEFAULT true NOT NULL,
	"data_deletion_mode" "data_deletion_mode" DEFAULT 'ANONYMIZE' NOT NULL,
	"retention_days" integer DEFAULT 30 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"default_retention_days" integer DEFAULT 30 NOT NULL,
	"allow_public_event_join" boolean DEFAULT false NOT NULL,
	"require_email_verification" boolean DEFAULT true NOT NULL,
	"allow_member_event_view" boolean DEFAULT true NOT NULL,
	"allow_viewer_reports" boolean DEFAULT false NOT NULL,
	"default_event_visibility" "event_visibility" DEFAULT 'WORKSPACE' NOT NULL,
	"default_qr_ttl_seconds" integer DEFAULT 30 NOT NULL,
	"default_offline_grace_seconds" integer DEFAULT 120 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspace_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"plan_key" text DEFAULT 'free_internal' NOT NULL,
	"max_members" integer,
	"max_events" integer,
	"max_attendees" integer,
	"max_monthly_checkins" integer,
	"storage_bytes" bigint NOT NULL,
	"monthly_checkins" integer DEFAULT 0 NOT NULL,
	"monthly_exports" integer DEFAULT 0 NOT NULL,
	"period_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"period_ends_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text,
	"name" text NOT NULL,
	"description" text,
	"logo_url" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"status" "workspace_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"purge_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendee_field_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"event_id" uuid,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" "field_type" NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"options" jsonb,
	"validation" jsonb,
	"position" integer DEFAULT 0 NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consent_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"event_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "event_assignment_role" NOT NULL,
	"assigned_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"location_name" text,
	"capacity" integer,
	"status" "session_status" DEFAULT 'SCHEDULED' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"checkin_opens_at" timestamp with time zone,
	"checkin_closes_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"attendance_policy" "attendance_policy" DEFAULT 'SINGLE_IN' NOT NULL,
	"required_board_count" integer,
	"checkin_modes" "checkin_mode"[] DEFAULT '{"ATTENDEE_CREDENTIAL","BOARD_QR"}' NOT NULL,
	"event_qr_behavior" "event_qr_behavior" DEFAULT 'JOIN_ONLY' NOT NULL,
	"qr_ttl_seconds" integer DEFAULT 30 NOT NULL,
	"credential_grace_seconds" integer DEFAULT 120 NOT NULL,
	"offline_sync_enabled" boolean DEFAULT true NOT NULL,
	"geofence_enabled" boolean DEFAULT false NOT NULL,
	"geofence_radius_meters" integer,
	"manual_checkin_enabled" boolean DEFAULT false NOT NULL,
	"manual_correction_enabled" boolean DEFAULT false NOT NULL,
	"require_correction_reason" boolean DEFAULT true NOT NULL,
	"certificate_enabled" boolean DEFAULT false NOT NULL,
	"attendance_proof_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "event_type" DEFAULT 'SINGLE_SESSION' NOT NULL,
	"visibility" "event_visibility" DEFAULT 'WORKSPACE' NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"timezone" text,
	"location" text NOT NULL,
	"location_name" text,
	"location_address" text,
	"latitude" double precision,
	"longitude" double precision,
	"geofence_radius" integer DEFAULT 100,
	"status" "event_status" DEFAULT 'DRAFT' NOT NULL,
	"capacity" integer,
	"waitlist_mode" "waitlist_mode" DEFAULT 'DISABLED' NOT NULL,
	"registration_mode" "registration_mode" DEFAULT 'WORKSPACE_MEMBERS' NOT NULL,
	"registration_opens_at" timestamp with time zone,
	"registration_closes_at" timestamp with time zone,
	"attendance_policy" "attendance_policy" DEFAULT 'SINGLE_IN' NOT NULL,
	"required_board_count" integer,
	"join_code" text NOT NULL,
	"public_slug" text,
	"registration_enabled" boolean DEFAULT true NOT NULL,
	"allowed_domains" text[] DEFAULT '{}' NOT NULL,
	"allowed_emails" text[] DEFAULT '{}' NOT NULL,
	"blocked_emails" text[] DEFAULT '{}' NOT NULL,
	"checkin_modes" "checkin_mode"[] DEFAULT '{"ATTENDEE_CREDENTIAL","BOARD_QR"}' NOT NULL,
	"event_qr_behavior" "event_qr_behavior" DEFAULT 'JOIN_ONLY' NOT NULL,
	"credential_grace_seconds" integer DEFAULT 120 NOT NULL,
	"custom_sessions_enabled" boolean DEFAULT false NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_by_id" uuid NOT NULL,
	"deleted_at" timestamp with time zone,
	"purge_after" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_proofs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"proof_code" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"location_name" text,
	"event_id" uuid NOT NULL,
	"session_id" uuid,
	"status" "board_status" DEFAULT 'ACTIVE' NOT NULL,
	"checkin_count" integer DEFAULT 0 NOT NULL,
	"last_checkin_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checkin_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkin_id" uuid NOT NULL,
	"action" "checkin_correction_action" NOT NULL,
	"reason" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checkin_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid,
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"session_id" uuid,
	"board_id" uuid,
	"direction" "checkin_direction" DEFAULT 'IN' NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"method" "checkin_method" DEFAULT 'QR_SCAN' NOT NULL,
	"source" "checkin_source" DEFAULT 'PERSONAL_QR' NOT NULL,
	"status" "checkin_status" DEFAULT 'VALID' NOT NULL,
	"scanned_by_id" uuid,
	"device_id" text,
	"latitude" double precision,
	"longitude" double precision,
	"ip_address" text,
	"user_agent" text,
	"metadata" jsonb,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "event_registrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"status" "registration_status" DEFAULT 'APPROVED' NOT NULL,
	"source" "registration_source" DEFAULT 'SELF_JOIN' NOT NULL,
	"approved_by_id" uuid,
	"approved_at" timestamp with time zone,
	"rejected_reason" text,
	"waitlist_position" integer,
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registration_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"policy_id" uuid NOT NULL,
	"accepted" boolean NOT NULL,
	"accepted_at" timestamp with time zone,
	"ip_address" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "registration_field_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"registration_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"value_text" text,
	"value_number" double precision,
	"value_date" timestamp with time zone,
	"value_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"event_id" uuid,
	"type" "export_type" NOT NULL,
	"status" "job_status" DEFAULT 'QUEUED' NOT NULL,
	"filters" jsonb,
	"file_url" text,
	"expires_at" timestamp with time zone,
	"summary" jsonb,
	"error_message" text,
	"requested_by_id" uuid NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"event_id" uuid,
	"type" "import_type" NOT NULL,
	"status" "job_status" DEFAULT 'QUEUED' NOT NULL,
	"file_url" text NOT NULL,
	"original_file_name" text,
	"mapping" jsonb,
	"summary" jsonb,
	"error_log_url" text,
	"requested_by_id" uuid NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid,
	"channel" "notification_channel" NOT NULL,
	"event_type" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"url" text NOT NULL,
	"secret_hash" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"subscribed_events" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_id_users_id_fk" FOREIGN KEY ("invited_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_policies" ADD CONSTRAINT "workspace_policies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspace_usage" ADD CONSTRAINT "workspace_usage_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendee_field_definitions" ADD CONSTRAINT "attendee_field_definitions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendee_field_definitions" ADD CONSTRAINT "attendee_field_definitions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consent_policies" ADD CONSTRAINT "consent_policies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "consent_policies" ADD CONSTRAINT "consent_policies_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_assignments" ADD CONSTRAINT "event_assignments_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_assignments" ADD CONSTRAINT "event_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_assignments" ADD CONSTRAINT "event_assignments_assigned_by_id_users_id_fk" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_settings" ADD CONSTRAINT "event_settings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_proofs" ADD CONSTRAINT "attendance_proofs_registration_id_event_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."event_registrations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_proofs" ADD CONSTRAINT "attendance_proofs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_proofs" ADD CONSTRAINT "attendance_proofs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boards" ADD CONSTRAINT "boards_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "boards" ADD CONSTRAINT "boards_session_id_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."event_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checkin_corrections" ADD CONSTRAINT "checkin_corrections_checkin_id_checkin_records_id_fk" FOREIGN KEY ("checkin_id") REFERENCES "public"."checkin_records"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checkin_records" ADD CONSTRAINT "checkin_records_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checkin_records" ADD CONSTRAINT "checkin_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checkin_records" ADD CONSTRAINT "checkin_records_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checkin_records" ADD CONSTRAINT "checkin_records_session_id_event_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."event_sessions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checkin_records" ADD CONSTRAINT "checkin_records_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "checkin_records" ADD CONSTRAINT "checkin_records_scanned_by_id_users_id_fk" FOREIGN KEY ("scanned_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "event_registrations" ADD CONSTRAINT "event_registrations_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_consents" ADD CONSTRAINT "registration_consents_registration_id_event_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."event_registrations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_consents" ADD CONSTRAINT "registration_consents_policy_id_consent_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."consent_policies"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_field_values" ADD CONSTRAINT "registration_field_values_registration_id_event_registrations_id_fk" FOREIGN KEY ("registration_id") REFERENCES "public"."event_registrations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "registration_field_values" ADD CONSTRAINT "registration_field_values_field_id_attendee_field_definitions_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."attendee_field_definitions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_workspace_created_idx" ON "audit_logs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_invitations_token_unique" ON "workspace_invitations" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workspace_invitations_workspace_email_idx" ON "workspace_invitations" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_members_workspace_user_unique" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_policies_workspace_id_unique" ON "workspace_policies" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_settings_workspace_id_unique" ON "workspace_settings" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspace_usage_workspace_id_unique" ON "workspace_usage" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_slug_unique" ON "workspaces" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attendee_field_definitions_workspace_event_key_unique" ON "attendee_field_definitions" USING btree ("workspace_id","event_id","key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendee_field_definitions_workspace_event_idx" ON "attendee_field_definitions" USING btree ("workspace_id","event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "consent_policies_workspace_event_idx" ON "consent_policies" USING btree ("workspace_id","event_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_assignments_event_user_unique" ON "event_assignments" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_sessions_event_starts_idx" ON "event_sessions" USING btree ("event_id","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_sessions_event_default_idx" ON "event_sessions" USING btree ("event_id","is_default");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_settings_event_id_unique" ON "event_settings" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "events_join_code_unique" ON "events" USING btree ("join_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_workspace_status_starts_idx" ON "events" USING btree ("workspace_id","status","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "events_workspace_public_slug_idx" ON "events" USING btree ("workspace_id","public_slug");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_proofs_proof_code_unique" ON "attendance_proofs" USING btree ("proof_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "attendance_proofs_event_user_idx" ON "attendance_proofs" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boards_event_status_idx" ON "boards" USING btree ("event_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "boards_session_status_idx" ON "boards" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checkin_corrections_checkin_idx" ON "checkin_corrections" USING btree ("checkin_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "checkin_records_idempotency_key_unique" ON "checkin_records" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checkin_records_user_event_idx" ON "checkin_records" USING btree ("user_id","event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checkin_records_event_board_idx" ON "checkin_records" USING btree ("event_id","board_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checkin_records_workspace_event_time_idx" ON "checkin_records" USING btree ("workspace_id","event_id","timestamp");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checkin_records_event_session_idx" ON "checkin_records" USING btree ("event_id","session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "checkin_records_board_time_idx" ON "checkin_records" USING btree ("board_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "event_registrations_user_event_unique" ON "event_registrations" USING btree ("user_id","event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "event_registrations_event_status_idx" ON "event_registrations" USING btree ("event_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "registration_consents_reg_policy_unique" ON "registration_consents" USING btree ("registration_id","policy_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "registration_field_values_reg_field_unique" ON "registration_field_values" USING btree ("registration_id","field_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "export_jobs_workspace_created_idx" ON "export_jobs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "export_jobs_event_created_idx" ON "export_jobs" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_jobs_workspace_created_idx" ON "import_jobs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "import_jobs_event_created_idx" ON "import_jobs" USING btree ("event_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "notification_preferences_user_workspace_channel_event_unique" ON "notification_preferences" USING btree ("user_id","workspace_id","channel","event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_endpoints_workspace_enabled_idx" ON "webhook_endpoints" USING btree ("workspace_id","enabled");