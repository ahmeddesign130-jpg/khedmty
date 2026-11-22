DO $$ BEGIN
  CREATE TYPE "DigitalProductStatus" AS ENUM ('PENDING_REVIEW','APPROVED','REJECTED','PAUSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "DigitalPurchaseStatus" AS ENUM ('PENDING_PAYMENT','PAYMENT_REVIEW','PAID','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "Store" (
  "id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "name" TEXT NOT NULL, "slug" TEXT NOT NULL,
  "description" TEXT NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Store_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Store_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Store_ownerId_key" ON "Store"("ownerId");
CREATE UNIQUE INDEX IF NOT EXISTS "Store_slug_key" ON "Store"("slug");

CREATE TABLE IF NOT EXISTS "DigitalProduct" (
  "id" TEXT NOT NULL, "storeId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
  "price" INTEGER NOT NULL, "filePath" TEXT NOT NULL, "fileName" TEXT NOT NULL, "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL, "coverUrl" TEXT, "status" "DigitalProductStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
  "reviewNote" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DigitalProduct_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DigitalProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "DigitalProduct_storeId_status_createdAt_idx" ON "DigitalProduct"("storeId","status","createdAt");

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
);
CREATE UNIQUE INDEX IF NOT EXISTS "DigitalPurchase_purchaseNo_key" ON "DigitalPurchase"("purchaseNo");
CREATE INDEX IF NOT EXISTS "DigitalPurchase_buyerId_createdAt_idx" ON "DigitalPurchase"("buyerId","createdAt");
CREATE INDEX IF NOT EXISTS "DigitalPurchase_sellerId_createdAt_idx" ON "DigitalPurchase"("sellerId","createdAt");
CREATE INDEX IF NOT EXISTS "DigitalPurchase_status_createdAt_idx" ON "DigitalPurchase"("status","createdAt");
