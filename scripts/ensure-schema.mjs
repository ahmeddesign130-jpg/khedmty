import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Preview builds must not mutate the production database or depend on its availability.
  // The additive compatibility repair runs in production and in the isolated CI database.
  if (process.env.VERCEL_ENV === "preview") {
    console.log("Skipping database schema compatibility repair in Vercel Preview.");
    return;
  }
  if (process.env.VERCEL_ENV === "production" && process.env.SCHEMA_SYNC_ON_BUILD !== "true") {
    console.log("Skipping production schema sync; the current schema is already applied. Set SCHEMA_SYNC_ON_BUILD=true for an intentional schema rollout.");
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

  // Restore the required payment amount column on legacy databases without losing payment rows.
  // Existing non-null amounts are preserved; missing values are derived from the linked order total.
  await prisma.$executeRawUnsafe('ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "amount" INTEGER');
  await prisma.$executeRawUnsafe('UPDATE "Payment" AS p SET "amount" = o."total" FROM "Order" AS o WHERE p."orderId" = o."id" AND p."amount" IS NULL');
  await prisma.$executeRawUnsafe('UPDATE "Payment" SET "amount" = 0 WHERE "amount" IS NULL');
  await prisma.$executeRawUnsafe('ALTER TABLE "Payment" ALTER COLUMN "amount" SET DEFAULT 0');
  await prisma.$executeRawUnsafe('ALTER TABLE "Payment" ALTER COLUMN "amount" SET NOT NULL');

  // Additive payment-review metadata; safe to run repeatedly on every build.
  // Legacy production databases may not yet have the payment method field.
  // Preserve existing payments and give older rows a neutral method value.
  await prisma.$executeRawUnsafe(`ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "method" TEXT NOT NULL DEFAULT 'OTHER'`);
  await prisma.$executeRawUnsafe('ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT, ADD COLUMN IF NOT EXISTS "reviewNote" TEXT, ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3)');
  await prisma.$executeRawUnsafe('ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "transferReference" TEXT, ADD COLUMN IF NOT EXISTS "transferDate" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "aiReceiptStatus" TEXT, ADD COLUMN IF NOT EXISTS "aiReceiptAmount" INTEGER, ADD COLUMN IF NOT EXISTS "aiReceiptConfidence" INTEGER, ADD COLUMN IF NOT EXISTS "aiReceiptNotes" TEXT, ADD COLUMN IF NOT EXISTS "aiReceiptCheckedAt" TIMESTAMP(3)');

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
  await prisma.$executeRawUnsafe('ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "href" TEXT');


  // Additive marketplace taxonomy and order requirement answers.
  await prisma.$executeRawUnsafe(`ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'أخرى', ADD COLUMN IF NOT EXISTS "subcategory" TEXT NOT NULL DEFAULT 'عام', ADD COLUMN IF NOT EXISTS "requirements" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`);
  // Public service references are required by the production database.
  await prisma.$executeRawUnsafe('ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "publicCode" TEXT');
  await prisma.$executeRawUnsafe(`UPDATE "Service" SET "publicCode" = 'KH-PUB-' || UPPER(SUBSTRING(MD5("id") FROM 1 FOR 12)) WHERE "publicCode" IS NULL`);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Service_publicCode_key" ON "Service"("publicCode")');
  await prisma.$executeRawUnsafe('ALTER TABLE "Service" ALTER COLUMN "publicCode" SET NOT NULL');
  await prisma.$executeRawUnsafe('ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "requirementsAnswers" TEXT');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Service_status_category_subcategory_idx" ON "Service"("status", "category", "subcategory")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "Service_status_price_idx" ON "Service"("status", "price")');

  console.log("Khedmty marketplace taxonomy and requirements schema compatibility check completed.");
}

main()
  .catch((error) => {
    console.error("Khedmty schema compatibility check failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
