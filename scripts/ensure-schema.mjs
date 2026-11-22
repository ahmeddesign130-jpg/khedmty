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


  // Digital storefront schema: additive and safe to re-run during deployment.
  const productStatusType = await prisma.$queryRawUnsafe('SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''DigitalProductStatus'') AS "exists"');
  if (!productStatusType[0].exists) await prisma.$executeRawUnsafe('CREATE TYPE "DigitalProductStatus" AS ENUM (''PENDING_REVIEW'',''APPROVED'',''REJECTED'',''PAUSED'')');
  const purchaseStatusType = await prisma.$queryRawUnsafe('SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = ''DigitalPurchaseStatus'') AS "exists"');
  if (!purchaseStatusType[0].exists) await prisma.$executeRawUnsafe('CREATE TYPE "DigitalPurchaseStatus" AS ENUM (''PENDING_PAYMENT'',''PAYMENT_REVIEW'',''PAID'',''REJECTED'')');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Store" (
      "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
      "description" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "Store_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Store_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Store_ownerId_key" ON "Store"("ownerId")');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "Store_slug_key" ON "Store"("slug")');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DigitalProduct" (
      "id" TEXT NOT NULL, "storeId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
      "price" INTEGER NOT NULL, "filePath" TEXT NOT NULL, "fileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL,
      "sizeBytes" INTEGER NOT NULL, "coverUrl" TEXT, "status" "DigitalProductStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
      "reviewNote" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "DigitalProduct_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "DigitalProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "DigitalProduct_storeId_status_createdAt_idx" ON "DigitalProduct"("storeId","status","createdAt")');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DigitalPurchase" (
      "id" TEXT NOT NULL, "purchaseNo" TEXT NOT NULL, "productId" TEXT NOT NULL, "buyerId" TEXT NOT NULL,
      "sellerId" TEXT NOT NULL, "productPrice" INTEGER NOT NULL, "commissionRate" INTEGER NOT NULL DEFAULT 20,
      "commission" INTEGER NOT NULL, "sellerNet" INTEGER NOT NULL, "total" INTEGER NOT NULL,
      "status" "DigitalPurchaseStatus" NOT NULL DEFAULT 'PENDING_PAYMENT', "paymentMethod" TEXT,
      "receiptPath" TEXT, "reviewNote" TEXT, "transferReference" TEXT, "transferDate" TIMESTAMP(3),
      "reviewedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DigitalPurchase_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "DigitalPurchase_productId_fkey" FOREIGN KEY ("productId") REFERENCES "DigitalProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "DigitalPurchase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "DigitalPurchase_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "DigitalPurchase_purchaseNo_key" ON "DigitalPurchase"("purchaseNo")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "DigitalPurchase_buyerId_createdAt_idx" ON "DigitalPurchase"("buyerId","createdAt")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "DigitalPurchase_sellerId_createdAt_idx" ON "DigitalPurchase"("sellerId","createdAt")');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "DigitalPurchase_status_createdAt_idx" ON "DigitalPurchase"("status","createdAt")');

  console.log("Khedmty email-auth, payment-review, delivery and digital-store schema compatibility check completed.");
}

main()
  .catch((error) => {
    console.error("Khedmty schema compatibility check failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
