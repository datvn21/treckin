-- CreateEnum
CREATE TYPE "WORKSPACE_STATUS" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED', 'DELETING');

-- CreateEnum
CREATE TYPE "EVENT_VISIBILITY" AS ENUM ('PRIVATE', 'WORKSPACE', 'PUBLIC_LINK');

-- CreateEnum
CREATE TYPE "DATA_DELETION_MODE" AS ENUM ('PURGE', 'ANONYMIZE');

-- CreateEnum
CREATE TYPE "EVENT_TYPE" AS ENUM ('SINGLE_SESSION', 'MULTI_SESSION', 'OPEN_CHECKIN');

-- CreateEnum
CREATE TYPE "REGISTRATION_MODE" AS ENUM ('CLOSED', 'INVITE_ONLY', 'WORKSPACE_MEMBERS', 'PUBLIC_LINK', 'APPROVAL_REQUIRED');

-- CreateEnum
CREATE TYPE "WAITLIST_MODE" AS ENUM ('DISABLED', 'AUTO_PROMOTE', 'MANUAL');

-- CreateEnum
CREATE TYPE "SESSION_STATUS" AS ENUM ('DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "REGISTRATION_STATUS" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'WAITLISTED', 'REJECTED', 'CANCELLED', 'CHECKED_IN', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "REGISTRATION_SOURCE" AS ENUM ('SELF_JOIN', 'INVITE', 'IMPORT', 'ADMIN_ADD', 'API', 'WAITLIST_PROMOTION');

-- CreateEnum
CREATE TYPE "FIELD_TYPE" AS ENUM ('TEXT', 'LONG_TEXT', 'NUMBER', 'EMAIL', 'PHONE', 'DATE', 'SELECT', 'MULTI_SELECT', 'CHECKBOX', 'FILE');

-- CreateEnum
CREATE TYPE "CHECKIN_STATUS" AS ENUM ('VALID', 'VOIDED', 'CORRECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "CHECKIN_CORRECTION_ACTION" AS ENUM ('VOID', 'RESTORE', 'CHANGE_TIME', 'CHANGE_BOARD', 'CHANGE_SESSION', 'CHANGE_DIRECTION');

-- CreateEnum
CREATE TYPE "JOB_STATUS" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IMPORT_TYPE" AS ENUM ('ATTENDEES', 'REGISTRATIONS', 'CHECKINS');

-- CreateEnum
CREATE TYPE "EXPORT_TYPE" AS ENUM ('EVENT_REPORT', 'ATTENDEE_LIST', 'CHECKIN_LOG', 'CERTIFICATES', 'AUDIT_LOG');

-- CreateEnum
CREATE TYPE "NOTIFICATION_CHANNEL" AS ENUM ('EMAIL', 'IN_APP', 'WEBHOOK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CHECKIN_SOURCE" ADD VALUE 'SHORT_CODE';
ALTER TYPE "CHECKIN_SOURCE" ADD VALUE 'KIOSK';
ALTER TYPE "CHECKIN_SOURCE" ADD VALUE 'CSV_IMPORT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EVENT_STATUS" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "EVENT_STATUS" ADD VALUE 'ARCHIVED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WORKSPACE_MEMBER_ROLE" ADD VALUE 'ADMIN';
ALTER TYPE "WORKSPACE_MEMBER_ROLE" ADD VALUE 'VIEWER';

-- DropForeignKey
ALTER TABLE "checkin_records" DROP CONSTRAINT "checkin_records_boardId_fkey";

-- AlterTable
ALTER TABLE "boards" ADD COLUMN     "code" TEXT,
ADD COLUMN     "lastCheckinAt" TIMESTAMP(3),
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "sessionId" UUID;

-- AlterTable
ALTER TABLE "checkin_records" ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "sessionId" UUID,
ADD COLUMN     "status" "CHECKIN_STATUS" NOT NULL DEFAULT 'VALID',
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "workspaceId" UUID;

-- AlterTable
ALTER TABLE "event_registrations" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" UUID,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "rejectedReason" TEXT,
ADD COLUMN     "source" "REGISTRATION_SOURCE" NOT NULL DEFAULT 'SELF_JOIN',
ADD COLUMN     "status" "REGISTRATION_STATUS" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "waitlistPosition" INTEGER;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "locationAddress" TEXT,
ADD COLUMN     "locationName" TEXT,
ADD COLUMN     "publicSlug" TEXT,
ADD COLUMN     "purgeAfter" TIMESTAMP(3),
ADD COLUMN     "registrationClosesAt" TIMESTAMP(3),
ADD COLUMN     "registrationMode" "REGISTRATION_MODE" NOT NULL DEFAULT 'WORKSPACE_MEMBERS',
ADD COLUMN     "registrationOpensAt" TIMESTAMP(3),
ADD COLUMN     "startsAt" TIMESTAMP(3),
ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "type" "EVENT_TYPE" NOT NULL DEFAULT 'SINGLE_SESSION',
ADD COLUMN     "visibility" "EVENT_VISIBILITY" NOT NULL DEFAULT 'WORKSPACE',
ADD COLUMN     "waitlistMode" "WAITLIST_MODE" NOT NULL DEFAULT 'DISABLED';

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "locale" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "purgeAfter" TIMESTAMP(3),
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "status" "WORKSPACE_STATUS" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC';

-- CreateTable
CREATE TABLE "workspace_settings" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "defaultRetentionDays" INTEGER NOT NULL DEFAULT 30,
    "allowPublicEventJoin" BOOLEAN NOT NULL DEFAULT false,
    "requireEmailVerification" BOOLEAN NOT NULL DEFAULT true,
    "allowMemberEventView" BOOLEAN NOT NULL DEFAULT true,
    "allowViewerReports" BOOLEAN NOT NULL DEFAULT false,
    "defaultEventVisibility" "EVENT_VISIBILITY" NOT NULL DEFAULT 'WORKSPACE',
    "defaultQrTtlSeconds" INTEGER NOT NULL DEFAULT 30,
    "defaultOfflineGraceSeconds" INTEGER NOT NULL DEFAULT 120,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_policies" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "memberCanCreateEvents" BOOLEAN NOT NULL DEFAULT false,
    "eventManagerCanInviteScanner" BOOLEAN NOT NULL DEFAULT true,
    "eventManagerCanExportReports" BOOLEAN NOT NULL DEFAULT true,
    "scannerCanSeeAttendeeList" BOOLEAN NOT NULL DEFAULT false,
    "scannerCanManualCheckin" BOOLEAN NOT NULL DEFAULT false,
    "viewerCanExportReports" BOOLEAN NOT NULL DEFAULT false,
    "requireApprovalForEvents" BOOLEAN NOT NULL DEFAULT false,
    "requireApprovalForImports" BOOLEAN NOT NULL DEFAULT false,
    "requireReasonForManualEdit" BOOLEAN NOT NULL DEFAULT true,
    "dataDeletionMode" "DATA_DELETION_MODE" NOT NULL DEFAULT 'ANONYMIZE',
    "retentionDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_usage" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "planKey" TEXT NOT NULL DEFAULT 'free_internal',
    "maxMembers" INTEGER,
    "maxEvents" INTEGER,
    "maxAttendees" INTEGER,
    "maxMonthlyCheckins" INTEGER,
    "storageBytes" BIGINT NOT NULL DEFAULT 0,
    "monthlyCheckins" INTEGER NOT NULL DEFAULT 0,
    "monthlyExports" INTEGER NOT NULL DEFAULT 0,
    "periodStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "periodEndsAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workspace_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_settings" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "attendancePolicy" "ATTENDANCE_POLICY" NOT NULL DEFAULT 'SINGLE_IN',
    "requiredBoardCount" INTEGER,
    "checkinModes" "CHECKIN_MODE"[] DEFAULT ARRAY['ATTENDEE_CREDENTIAL', 'BOARD_QR']::"CHECKIN_MODE"[],
    "eventQrBehavior" "EVENT_QR_BEHAVIOR" NOT NULL DEFAULT 'JOIN_ONLY',
    "qrTtlSeconds" INTEGER NOT NULL DEFAULT 30,
    "credentialGraceSeconds" INTEGER NOT NULL DEFAULT 120,
    "offlineSyncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "geofenceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "geofenceRadiusMeters" INTEGER,
    "manualCheckinEnabled" BOOLEAN NOT NULL DEFAULT false,
    "manualCorrectionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "requireCorrectionReason" BOOLEAN NOT NULL DEFAULT true,
    "certificateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "attendanceProofEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_sessions" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "locationName" TEXT,
    "capacity" INTEGER,
    "status" "SESSION_STATUS" NOT NULL DEFAULT 'SCHEDULED',
    "checkinOpensAt" TIMESTAMP(3),
    "checkinClosesAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkin_corrections" (
    "id" UUID NOT NULL,
    "checkinId" UUID NOT NULL,
    "action" "CHECKIN_CORRECTION_ACTION" NOT NULL,
    "reason" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkin_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendee_field_definitions" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "eventId" UUID,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "FIELD_TYPE" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "validation" JSONB,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendee_field_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_field_values" (
    "id" UUID NOT NULL,
    "registrationId" UUID NOT NULL,
    "fieldId" UUID NOT NULL,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueDate" TIMESTAMP(3),
    "valueJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registration_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_policies" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "eventId" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_consents" (
    "id" UUID NOT NULL,
    "registrationId" UUID NOT NULL,
    "policyId" UUID NOT NULL,
    "accepted" BOOLEAN NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "ipAddress" TEXT,

    CONSTRAINT "registration_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_proofs" (
    "id" UUID NOT NULL,
    "registrationId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "proofCode" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "attendance_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "eventId" UUID,
    "type" "IMPORT_TYPE" NOT NULL,
    "status" "JOB_STATUS" NOT NULL DEFAULT 'QUEUED',
    "fileUrl" TEXT NOT NULL,
    "originalFileName" TEXT,
    "mapping" JSONB,
    "summary" JSONB,
    "errorLogUrl" TEXT,
    "requestedById" UUID NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "eventId" UUID,
    "type" "EXPORT_TYPE" NOT NULL,
    "status" "JOB_STATUS" NOT NULL DEFAULT 'QUEUED',
    "filters" JSONB,
    "fileUrl" TEXT,
    "expiresAt" TIMESTAMP(3),
    "summary" JSONB,
    "errorMessage" TEXT,
    "requestedById" UUID NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "workspaceId" UUID,
    "channel" "NOTIFICATION_CHANNEL" NOT NULL,
    "eventType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_endpoints" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "subscribedEvents" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workspace_settings_workspaceId_key" ON "workspace_settings"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_policies_workspaceId_key" ON "workspace_policies"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_usage_workspaceId_key" ON "workspace_usage"("workspaceId");

-- CreateIndex
CREATE INDEX "audit_logs_workspaceId_createdAt_idx" ON "audit_logs"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "event_settings_eventId_key" ON "event_settings"("eventId");

-- CreateIndex
CREATE INDEX "event_sessions_eventId_startsAt_idx" ON "event_sessions"("eventId", "startsAt");

-- CreateIndex
CREATE INDEX "checkin_corrections_checkinId_idx" ON "checkin_corrections"("checkinId");

-- CreateIndex
CREATE INDEX "attendee_field_definitions_workspaceId_eventId_idx" ON "attendee_field_definitions"("workspaceId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "attendee_field_definitions_workspaceId_eventId_key_key" ON "attendee_field_definitions"("workspaceId", "eventId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "registration_field_values_registrationId_fieldId_key" ON "registration_field_values"("registrationId", "fieldId");

-- CreateIndex
CREATE INDEX "consent_policies_workspaceId_eventId_idx" ON "consent_policies"("workspaceId", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "registration_consents_registrationId_policyId_key" ON "registration_consents"("registrationId", "policyId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_proofs_proofCode_key" ON "attendance_proofs"("proofCode");

-- CreateIndex
CREATE INDEX "attendance_proofs_eventId_userId_idx" ON "attendance_proofs"("eventId", "userId");

-- CreateIndex
CREATE INDEX "import_jobs_workspaceId_createdAt_idx" ON "import_jobs"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "import_jobs_eventId_createdAt_idx" ON "import_jobs"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "export_jobs_workspaceId_createdAt_idx" ON "export_jobs"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "export_jobs_eventId_createdAt_idx" ON "export_jobs"("eventId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_workspaceId_channel_eventTy_key" ON "notification_preferences"("userId", "workspaceId", "channel", "eventType");

-- CreateIndex
CREATE INDEX "webhook_endpoints_workspaceId_enabled_idx" ON "webhook_endpoints"("workspaceId", "enabled");

-- CreateIndex
CREATE INDEX "boards_eventId_status_idx" ON "boards"("eventId", "status");

-- CreateIndex
CREATE INDEX "boards_sessionId_status_idx" ON "boards"("sessionId", "status");

-- CreateIndex
CREATE INDEX "checkin_records_workspaceId_eventId_timestamp_idx" ON "checkin_records"("workspaceId", "eventId", "timestamp");

-- CreateIndex
CREATE INDEX "checkin_records_eventId_sessionId_idx" ON "checkin_records"("eventId", "sessionId");

-- CreateIndex
CREATE INDEX "checkin_records_boardId_timestamp_idx" ON "checkin_records"("boardId", "timestamp");

-- CreateIndex
CREATE INDEX "event_registrations_eventId_status_idx" ON "event_registrations"("eventId", "status");

-- CreateIndex
CREATE INDEX "events_workspaceId_status_startsAt_idx" ON "events"("workspaceId", "status", "startsAt");

-- CreateIndex
CREATE INDEX "events_workspaceId_publicSlug_idx" ON "events"("workspaceId", "publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_slug_key" ON "workspaces"("slug");

-- AddForeignKey
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_policies" ADD CONSTRAINT "workspace_policies_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_usage" ADD CONSTRAINT "workspace_usage_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_settings" ADD CONSTRAINT "event_settings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sessions" ADD CONSTRAINT "event_sessions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boards" ADD CONSTRAINT "boards_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "event_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_records" ADD CONSTRAINT "checkin_records_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_records" ADD CONSTRAINT "checkin_records_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "event_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_records" ADD CONSTRAINT "checkin_records_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_corrections" ADD CONSTRAINT "checkin_corrections_checkinId_fkey" FOREIGN KEY ("checkinId") REFERENCES "checkin_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendee_field_definitions" ADD CONSTRAINT "attendee_field_definitions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendee_field_definitions" ADD CONSTRAINT "attendee_field_definitions_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_field_values" ADD CONSTRAINT "registration_field_values_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "event_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_field_values" ADD CONSTRAINT "registration_field_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "attendee_field_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_policies" ADD CONSTRAINT "consent_policies_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_policies" ADD CONSTRAINT "consent_policies_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_consents" ADD CONSTRAINT "registration_consents_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "event_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_consents" ADD CONSTRAINT "registration_consents_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "consent_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_proofs" ADD CONSTRAINT "attendance_proofs_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "event_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_proofs" ADD CONSTRAINT "attendance_proofs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_proofs" ADD CONSTRAINT "attendance_proofs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

