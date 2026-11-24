import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Preview builds must not mutate the production database or depend on its availability.
  // The additive compatibility repair runs in production and in the isolated CI database.
  if (process.env.VERCEL_ENV === "preview") {
    console.log("Skipping database schema compatibility repair in Vercel Preview.");
    return;
  }

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
      ADD COLUMN IF NOT EXISTS "providerNet" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "total" INTEGER NOT NULL DEFAULT 0
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

  // Additive order workflow state; safe to run repeatedly on every build.
  await prisma.$executeRawUnsafe('ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS \'DELIVERY_REVIEW\'');

  // Additive payment-review metadata; safe to run repeatedly on every build.
  await prisma.$executeRawUnsafe('ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "transferReference" TEXT, ADD COLUMN IF NOT EXISTS "transferDate" TIMESTAMP(3)');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "OrderDeliveryFile" (
      "id" TEXT NOT NULL,
      "orderId" TEXT NOT NULL,
      "uploaderId" TEXT NOT NULL,
      "objectPath" TEXT NOT NULL,
      "fileName" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "sizeBytes" INTEGER NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OrderDeliveryFile_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "OrderDeliveryFile_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "OrderDeliveryFile_objectPath_key" ON "OrderDeliveryFile"("objectPath")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "OrderDeliveryFile_orderId_createdAt_idx" ON "OrderDeliveryFile"("orderId", "createdAt")');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Notification" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "body" TEXT NOT NULL,
      "href" TEXT,
      "readAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt")');


  console.log("Khedmty email-auth, payment-review and delivery schema compatibility check completed.");
}

main()
  .catch((error) => {
    console.error("Khedmty schema compatibility check failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
