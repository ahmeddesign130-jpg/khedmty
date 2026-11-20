-- Escrow is an internal workflow ledger only. It does not custody or move external wallet funds.
CREATE TYPE "EscrowStatus" AS ENUM ('NOT_FUNDED', 'HELD', 'DISPUTED', 'RELEASED', 'REFUNDED');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_FOR_CUSTOMER', 'RESOLVED_FOR_PROVIDER');
CREATE TYPE "EscrowEntryType" AS ENUM ('HOLD', 'RELEASE', 'REFUND');

ALTER TABLE "Order"
  ADD COLUMN "escrowStatus" "EscrowStatus" NOT NULL DEFAULT 'NOT_FUNDED',
  ADD COLUMN "escrowAmount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "escrowHeldAt" TIMESTAMP(3),
  ADD COLUMN "escrowReleasedAt" TIMESTAMP(3);

CREATE TABLE "EscrowLedger" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "entryType" "EscrowEntryType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "note" TEXT,
  "actorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EscrowLedger_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EscrowLedger_orderId_entryType_key" ON "EscrowLedger"("orderId", "entryType");
CREATE INDEX "EscrowLedger_createdAt_idx" ON "EscrowLedger"("createdAt");
ALTER TABLE "EscrowLedger" ADD CONSTRAINT "EscrowLedger_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Dispute" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "openedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "adminNote" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Dispute_orderId_key" ON "Dispute"("orderId");
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
