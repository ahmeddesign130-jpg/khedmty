import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function prismaDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.port === "6543" || url.hostname.includes(".pooler.supabase.com")) {
      url.searchParams.set("pgbouncer", "true");
      url.searchParams.set("statement_cache_size", "0");
      if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "1");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

const basePrisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: { db: { url: prismaDatabaseUrl() } },
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

let compatibilitySchemaPromise: Promise<void> | undefined;

async function ensureCompatibilitySchema() {
  if (!compatibilitySchemaPromise) {
    compatibilitySchemaPromise = (async () => {
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."User"
         ADD COLUMN IF NOT EXISTS "displayName" TEXT NOT NULL DEFAULT 'مستخدم'`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."User"
         ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMPTZ`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."User"
         ADD COLUMN IF NOT EXISTS "sessionVersion" INTEGER NOT NULL DEFAULT 0`
      );
      // Existing accounts predate email OTP and remain usable; new registrations
      // explicitly keep this column NULL until the submitted code is verified.
      await basePrisma.$executeRawUnsafe(
        `UPDATE public."User" SET "emailVerifiedAt" = "createdAt"
         WHERE "emailVerifiedAt" IS NULL AND "createdAt" < NOW() - INTERVAL '2 minutes'`
      );
      await basePrisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS public."EmailOtp" (
          "id" TEXT PRIMARY KEY,
          "userId" TEXT NOT NULL UNIQUE REFERENCES public."User"("id") ON DELETE CASCADE,
          "codeHash" TEXT NOT NULL,
          "expiresAt" TIMESTAMPTZ NOT NULL,
          "attempts" INTEGER NOT NULL DEFAULT 0,
          "consumedAt" TIMESTAMPTZ,
          "lastSentAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );
      await basePrisma.$executeRawUnsafe(
        `CREATE INDEX IF NOT EXISTS "EmailOtp_expiresAt_idx" ON public."EmailOtp" ("expiresAt")`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Service"
         ADD COLUMN IF NOT EXISTS "price" INTEGER NOT NULL DEFAULT 0`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Order"
         ADD COLUMN IF NOT EXISTS "orderNo" TEXT`
      );
      await basePrisma.$executeRawUnsafe(
        `UPDATE public."Order"
         SET "orderNo" = 'KH-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 16))
         WHERE "orderNo" IS NULL`
      );
      await basePrisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNo_key" ON public."Order" ("orderNo")`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Order" ALTER COLUMN "orderNo" SET NOT NULL`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Service"
         ADD COLUMN IF NOT EXISTS "mediaUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Service" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Service" ADD COLUMN IF NOT EXISTS "serviceNo" TEXT`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Order" ADD COLUMN IF NOT EXISTS "customerContact" TEXT`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."User"
         ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMPTZ,
         ADD COLUMN IF NOT EXISTS "termsVersion" TEXT`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Order"
         ADD COLUMN IF NOT EXISTS "servicePrice" INTEGER NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS "commissionRate" INTEGER NOT NULL DEFAULT 20,
         ADD COLUMN IF NOT EXISTS "commission" INTEGER NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS "providerNet" INTEGER NOT NULL DEFAULT 0,
         ADD COLUMN IF NOT EXISTS "total" INTEGER NOT NULL DEFAULT 0`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Order"
         ALTER COLUMN "commissionRate" SET DEFAULT 20`
      );
      await basePrisma.$executeRawUnsafe(
        `CREATE TABLE IF NOT EXISTS public."PlatformSettings" (
          "id" TEXT NOT NULL DEFAULT 'main',
          "commissionRate" INTEGER NOT NULL DEFAULT 20,
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
        )`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."PlatformSettings"
         ADD COLUMN IF NOT EXISTS "commissionRate" INTEGER NOT NULL DEFAULT 20,
         ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."PlatformSettings"
         ALTER COLUMN "commissionRate" SET DEFAULT 20`
      );
      // AuditLog.details is a free-form string in Prisma. Normalize legacy JSONB safely.
      await basePrisma.$executeRawUnsafe(`DO $audit_log_compat$
      DECLARE details_type TEXT;
      BEGIN
        SELECT data_type INTO details_type
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'AuditLog' AND column_name = 'details';
        IF details_type = 'jsonb' THEN
          ALTER TABLE public."AuditLog"
          ALTER COLUMN "details" TYPE TEXT
          USING CASE
            WHEN jsonb_typeof("details") = 'string' THEN "details" #>> '{}'
            ELSE "details"::text
          END;
        ELSIF details_type IS NOT NULL AND details_type <> 'text' THEN
          ALTER TABLE public."AuditLog"
          ALTER COLUMN "details" TYPE TEXT USING "details"::text;
        END IF;
      END
      $audit_log_compat$;
      `);
      // Payment-review compatibility: preserve legacy rows while adding all fields used by the current workflow.
      await basePrisma.$executeRawUnsafe("ALTER TABLE IF EXISTS public.\"Payment\" ADD COLUMN IF NOT EXISTS \"method\" TEXT NOT NULL DEFAULT 'OTHER', ADD COLUMN IF NOT EXISTS \"receiptUrl\" TEXT, ADD COLUMN IF NOT EXISTS \"amount\" INTEGER, ADD COLUMN IF NOT EXISTS \"reviewNote\" TEXT, ADD COLUMN IF NOT EXISTS \"reviewedAt\" TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS \"transferReference\" TEXT, ADD COLUMN IF NOT EXISTS \"transferDate\" TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS \"aiReceiptStatus\" TEXT, ADD COLUMN IF NOT EXISTS \"aiReceiptAmount\" INTEGER, ADD COLUMN IF NOT EXISTS \"aiReceiptConfidence\" INTEGER, ADD COLUMN IF NOT EXISTS \"aiReceiptNotes\" TEXT, ADD COLUMN IF NOT EXISTS \"aiReceiptCheckedAt\" TIMESTAMPTZ, ADD COLUMN IF NOT EXISTS \"createdAt\" TIMESTAMPTZ NOT NULL DEFAULT NOW()");
      await basePrisma.$executeRawUnsafe("UPDATE public.\"Payment\" AS p SET \"amount\" = o.\"total\" FROM public.\"Order\" AS o WHERE p.\"orderId\" = o.\"id\" AND p.\"amount\" IS NULL");
      await basePrisma.$executeRawUnsafe("UPDATE public.\"Payment\" SET \"amount\" = 0 WHERE \"amount\" IS NULL");
      await basePrisma.$executeRawUnsafe("ALTER TABLE public.\"Payment\" ALTER COLUMN \"amount\" SET DEFAULT 0");
      await basePrisma.$executeRawUnsafe("ALTER TABLE public.\"Payment\" ALTER COLUMN \"amount\" SET NOT NULL");

      await basePrisma.$executeRawUnsafe(
        `UPDATE public."Service"
         SET "serviceNo" = 'KH-SRV-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 12))
         WHERE "serviceNo" IS NULL`
      );
      await basePrisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "Service_serviceNo_key" ON public."Service" ("serviceNo")`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Service" ALTER COLUMN "serviceNo" SET NOT NULL`
      );
    })().catch((error) => {
      compatibilitySchemaPromise = undefined;
      throw error;
    });
  }
  await compatibilitySchemaPromise;
}

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        await ensureCompatibilitySchema();
        return query(args);
      },
    },
  },
});
