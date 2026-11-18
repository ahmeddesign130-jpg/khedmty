import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const basePrisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

// Additive compatibility migration for older production databases.
// It only adds columns and indexes; it never drops or overwrites existing service data.
let compatibilitySchemaPromise: Promise<void> | undefined;

async function ensureCompatibilitySchema() {
  if (!compatibilitySchemaPromise) {
    compatibilitySchemaPromise = (async () => {
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."User"
         ADD COLUMN IF NOT EXISTS "displayName" TEXT NOT NULL DEFAULT 'مستخدم'`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Service"
         ADD COLUMN IF NOT EXISTS "mediaUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Service"
         ADD COLUMN IF NOT EXISTS "reviewNote" TEXT`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Service"
         ADD COLUMN IF NOT EXISTS "serviceNo" TEXT`
      );
      // Backfill only missing numbers. Existing service numbers are preserved.
      await basePrisma.$executeRawUnsafe(
        `UPDATE public."Service"
         SET "serviceNo" = 'KH-SRV-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 12))
         WHERE "serviceNo" IS NULL`
      );
      await basePrisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "Service_serviceNo_key"
         ON public."Service" ("serviceNo")`
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
