ALTER TABLE "Payment"
  ADD COLUMN "transferReference" TEXT,
  ADD COLUMN "transferDate" TIMESTAMP(3),
  ADD COLUMN "aiReviewStatus" TEXT,
  ADD COLUMN "aiReviewSummary" TEXT;

CREATE TABLE "OrderDeliveryFile" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "uploaderId" TEXT NOT NULL,
  "objectPath" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderDeliveryFile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrderDeliveryFile_objectPath_key" ON "OrderDeliveryFile"("objectPath");
CREATE INDEX "OrderDeliveryFile_orderId_createdAt_idx" ON "OrderDeliveryFile"("orderId", "createdAt");
ALTER TABLE "OrderDeliveryFile" ADD CONSTRAINT "OrderDeliveryFile_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
