-- Safe additive columns for service media and moderation feedback.
-- Take a database backup before applying.
ALTER TABLE "Service"
  ADD COLUMN IF NOT EXISTS "mediaUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Service"
  ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;
