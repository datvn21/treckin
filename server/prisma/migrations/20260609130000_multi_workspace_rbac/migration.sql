CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE "WORKSPACE_MEMBER_ROLE" AS ENUM ('OWNER', 'MEMBER');
CREATE TYPE "INVITATION_STATUS" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
CREATE TYPE "EVENT_ASSIGNMENT_ROLE" AS ENUM ('MANAGER', 'SCANNER');

CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_members" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "WORKSPACE_MEMBER_ROLE" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspace_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workspace_invitations" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "INVITATION_STATUS" NOT NULL DEFAULT 'PENDING',
    "invitedById" UUID NOT NULL,
    "acceptedById" UUID,
    "acceptedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "workspace_invitations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "event_assignments" (
    "id" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "EVENT_ASSIGNMENT_ROLE" NOT NULL,
    "assignedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "event_assignments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "events" ADD COLUMN "workspaceId" UUID;
ALTER TABLE "events" ADD COLUMN "joinCode" TEXT;
ALTER TABLE "events" ADD COLUMN "registrationEnabled" BOOLEAN NOT NULL DEFAULT true;

WITH creators AS (
    SELECT DISTINCT "createdById" FROM "events"
),
created_workspaces AS (
    INSERT INTO "workspaces" ("id", "name", "createdById", "updatedAt")
    SELECT gen_random_uuid(), COALESCE(u."name", 'My workspace') || '''s workspace', c."createdById", CURRENT_TIMESTAMP
    FROM creators c
    JOIN "users" u ON u."id" = c."createdById"
    RETURNING "id", "createdById"
)
INSERT INTO "workspace_members" ("id", "workspaceId", "userId", "role", "updatedAt")
SELECT gen_random_uuid(), cw."id", cw."createdById", 'OWNER', CURRENT_TIMESTAMP
FROM created_workspaces cw;

UPDATE "events" e
SET "workspaceId" = w."id"
FROM "workspaces" w
WHERE w."createdById" = e."createdById"
  AND e."workspaceId" IS NULL;

UPDATE "events"
SET "joinCode" = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE "joinCode" IS NULL;

ALTER TABLE "events" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "events" ALTER COLUMN "joinCode" SET NOT NULL;

CREATE UNIQUE INDEX "workspace_members_workspaceId_userId_key" ON "workspace_members"("workspaceId", "userId");
CREATE UNIQUE INDEX "workspace_invitations_token_key" ON "workspace_invitations"("token");
CREATE INDEX "workspace_invitations_workspaceId_email_idx" ON "workspace_invitations"("workspaceId", "email");
CREATE UNIQUE INDEX "events_joinCode_key" ON "events"("joinCode");
CREATE UNIQUE INDEX "event_assignments_eventId_userId_key" ON "event_assignments"("eventId", "userId");

ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "events" ADD CONSTRAINT "events_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "event_assignments" ADD CONSTRAINT "event_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_assignments" ADD CONSTRAINT "event_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "event_assignments" ADD CONSTRAINT "event_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
