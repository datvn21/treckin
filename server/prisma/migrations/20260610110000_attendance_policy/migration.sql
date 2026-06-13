CREATE TYPE "ATTENDANCE_POLICY" AS ENUM ('SINGLE_IN', 'IN_OUT', 'BOARD_REQUIREMENTS');
CREATE TYPE "CHECKIN_DIRECTION" AS ENUM ('IN', 'OUT');
CREATE TYPE "CHECKIN_SOURCE" AS ENUM ('PERSONAL_QR', 'BOARD_QR', 'MANUAL', 'OFFLINE_SYNC');

ALTER TABLE "events"
  ADD COLUMN "attendancePolicy" "ATTENDANCE_POLICY" NOT NULL DEFAULT 'SINGLE_IN',
  ADD COLUMN "requiredBoardCount" INTEGER;

ALTER TABLE "checkin_records"
  ADD COLUMN "direction" "CHECKIN_DIRECTION" NOT NULL DEFAULT 'IN',
  ADD COLUMN "source" "CHECKIN_SOURCE" NOT NULL DEFAULT 'PERSONAL_QR',
  ADD COLUMN "scannedById" UUID,
  ADD COLUMN "idempotencyKey" TEXT;

UPDATE "checkin_records"
SET "idempotencyKey" = "eventId"::text || ':' || "userId"::text || ':single-in'
WHERE "idempotencyKey" IS NULL;

ALTER TABLE "checkin_records" ALTER COLUMN "idempotencyKey" SET NOT NULL;

DROP INDEX IF EXISTS "checkin_records_userId_eventId_key";

CREATE UNIQUE INDEX "checkin_records_idempotencyKey_key" ON "checkin_records"("idempotencyKey");
CREATE INDEX "checkin_records_userId_eventId_idx" ON "checkin_records"("userId", "eventId");
CREATE INDEX "checkin_records_eventId_boardId_idx" ON "checkin_records"("eventId", "boardId");

ALTER TABLE "checkin_records"
  ALTER COLUMN "boardId" DROP NOT NULL;

ALTER TABLE "checkin_records"
  ADD CONSTRAINT "checkin_records_scannedById_fkey"
  FOREIGN KEY ("scannedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
