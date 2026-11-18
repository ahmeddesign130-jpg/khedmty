-- Safe additive migration for databases created before service numbers were added.
ALTER TABLE IF EXISTS public."Service"
  ADD COLUMN IF NOT EXISTS "serviceNo" TEXT;

-- Assign stable unique numbers only to existing rows that do not have one.
UPDATE public."Service"
SET "serviceNo" = 'KH-SRV-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 12))
WHERE "serviceNo" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Service_serviceNo_key"
  ON public."Service" ("serviceNo");
