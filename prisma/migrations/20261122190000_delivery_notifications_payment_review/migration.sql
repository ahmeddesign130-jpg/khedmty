ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERY_REVIEW';

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "transferReference" TEXT,
  ADD COLUMN IF NOT EXISTS "transferDate" TIMESTAMP(3);

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
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrderDeliveryFile_objectPath_key" ON "OrderDeliveryFile"("objectPath");
CREATE INDEX IF NOT EXISTS "OrderDeliveryFile_orderId_createdAt_idx" ON "OrderDeliveryFile"("orderId", "createdAt");

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
);
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
