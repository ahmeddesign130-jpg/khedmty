import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to apply the additive schema compatibility check.");
  }

  // Additive, repeatable compatibility repair for the email-verification release.
  // It never drops or rewrites existing records.
  await prisma.$executeRawUnsafe(
    'ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "termsVersion" TEXT'
  );

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "EmailOtp" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "codeHash" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "consumedAt" TIMESTAMP(3),
      "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "EmailOtp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "EmailOtp_userId_key" ON "EmailOtp"("userId")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "EmailOtp_expiresAt_idx" ON "EmailOtp"("expiresAt")');

  // Add the missing platform configuration table without altering existing records.
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Order"
      ADD COLUMN IF NOT EXISTS "servicePrice" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "commissionRate" INTEGER NOT NULL DEFAULT 20,
      ADD COLUMN IF NOT EXISTS "commission" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "providerNet" INTEGER NOT NULL DEFAULT 0
  `);
  await prisma.$executeRawUnsafe('ALTER TABLE "Order" ALTER COLUMN "commissionRate" SET DEFAULT 20');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PlatformSettings" (
      "id" TEXT NOT NULL DEFAULT 'main',
      "commissionRate" INTEGER NOT NULL DEFAULT 20,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "PlatformSettings"
      ADD COLUMN IF NOT EXISTS "commissionRate" INTEGER NOT NULL DEFAULT 20,
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  `);
  await prisma.$executeRawUnsafe('ALTER TABLE "PlatformSettings" ALTER COLUMN "commissionRate" SET DEFAULT 20');

  console.log("Khedmty email-auth schema compatibility check completed.");
}

main()
  .catch((error) => {
    console.error("Khedmty schema compatibility check failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
