-- Drop MSSV (TDTU-specific student ID) — no longer needed as a schema field.
-- The field may be revisited as a neutral optional profile field in a future migration.
DROP INDEX IF EXISTS "users_mssv_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "mssv";

-- Add per-event credential grace window (seconds).
-- Default is 120 s. Allowed range 0-300 is enforced at the application layer.
ALTER TABLE "events" ADD COLUMN "credentialGraceSeconds" INTEGER NOT NULL DEFAULT 120;
