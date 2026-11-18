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
         ADD COLUMN IF NOT EXISTS "price" INTEGER NOT NULL DEFAULT 0`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Order"
         ADD COLUMN IF NOT EXISTS "orderNo" TEXT`
      );
      // Backfill order numbers for legacy rows without changing existing values.
      await basePrisma.$executeRawUnsafe(
        `UPDATE public."Order"
         SET "orderNo" = 'KH-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 16))
         WHERE "orderNo" IS NULL`
      );
      await basePrisma.$executeRawUnsafe(
        `CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNo_key"
         ON public."Order" ("orderNo")`
      );
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Order"
         ALTER COLUMN "orderNo" SET NOT NULL`
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
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Order"
         ADD COLUMN IF NOT EXISTS "customerContact" TEXT`
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
      await basePrisma.$executeRawUnsafe(
        `ALTER TABLE IF EXISTS public."Service"
         ALTER COLUMN "serviceNo" SET NOT NULL`
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
