import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const basePrisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = basePrisma;
}

// Additive compatibility migration for databases created before the latest
// Prisma schema. This only adds nullable/defaulted columns; it never drops data.
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
