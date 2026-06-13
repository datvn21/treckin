ALTER TABLE "events"
ADD COLUMN "customSessionsEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "event_sessions"
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

INSERT INTO "event_sessions" (
  "id",
  "eventId",
  "title",
  "description",
  "startsAt",
  "endsAt",
  "locationName",
  "capacity",
  "status",
  "isDefault",
  "checkinOpensAt",
  "checkinClosesAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  "id",
  'Full event',
  NULL,
  "startTime",
  "endTime",
  COALESCE("locationName", "location"),
  "capacity",
  'SCHEDULED',
  true,
  NULL,
  NULL,
  NOW(),
  NOW()
FROM "events"
WHERE NOT EXISTS (
  SELECT 1
  FROM "event_sessions"
  WHERE "event_sessions"."eventId" = "events"."id"
    AND "event_sessions"."isDefault" = true
);

CREATE UNIQUE INDEX "event_sessions_one_default_per_event"
ON "event_sessions"("eventId")
WHERE "isDefault" = true;
