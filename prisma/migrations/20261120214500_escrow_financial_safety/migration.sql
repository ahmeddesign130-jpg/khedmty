ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'REFUNDED';

CREATE TYPE "EscrowStatus" AS ENUM ('HELD', 'RELEASED', 'REFUNDED', 'DISPUTED');
CREATE TYPE "EscrowLedgerType" AS ENUM ('HOLD', 'PROVIDER_RELEASE', 'PLATFORM_FEE', 'CUSTOMER_REFUND');
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED');
CREATE TYPE "DisputeResolution" AS ENUM ('RELEASE_TO_PROVIDER', 'REFUND_CUSTOMER');

-- Stop rather than inventing a balance for any already-paid order whose verified
-- payment or original amount split cannot be reconciled.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Order" o
    WHERE o.status IN ('PAID', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED')
      AND (
        o."servicePrice" + o.commission <> o.total
        OR (
          SELECT COUNT(*)
          FROM "Payment" p
          WHERE p."orderId" = o.id
            AND p.status = 'APPROVED'
            AND p.amount = o.total
        ) <> 1
      )
  ) THEN
    RAISE EXCEPTION 'Escrow migration stopped: an active/complete paid order has no single matching approved payment or has an inconsistent amount split. Reconcile these orders before retrying.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "Order" o
    JOIN "Payment" p ON p."orderId" = o.id
    WHERE p.status = 'APPROVED'
      AND o.status IN ('CANCELLED', 'REJECTED')
  ) THEN
    RAISE EXCEPTION 'Escrow migration stopped: a cancelled/rejected order has an approved payment. Reconcile it manually before retrying.';
  END IF;
END $$;

CREATE TABLE "OrderEscrow" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "providerAmount" INTEGER NOT NULL,
  "platformFee" INTEGER NOT NULL,
  "status" "EscrowStatus" NOT NULL DEFAULT 'HELD',
  "resolutionNote" TEXT,
  "externalReference" TEXT,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderEscrow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderEscrow_amount_check" CHECK (
    "amount" > 0 AND "providerAmount" > 0 AND "platformFee" >= 0
    AND "amount" = "providerAmount" + "platformFee"
  )
);

CREATE UNIQUE INDEX "OrderEscrow_orderId_key" ON "OrderEscrow"("orderId");
CREATE UNIQUE INDEX "OrderEscrow_paymentId_key" ON "OrderEscrow"("paymentId");

CREATE TABLE "EscrowLedgerEntry" (
  "id" TEXT NOT NULL,
  "escrowId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "type" "EscrowLedgerType" NOT NULL,
  "amount" INTEGER NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "externalReference" TEXT,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EscrowLedgerEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EscrowLedgerEntry_amount_check" CHECK ("amount" > 0)
);

CREATE UNIQUE INDEX "EscrowLedgerEntry_idempotencyKey_key" ON "EscrowLedgerEntry"("idempotencyKey");
CREATE INDEX "EscrowLedgerEntry_orderId_createdAt_idx" ON "EscrowLedgerEntry"("orderId", "createdAt");
CREATE INDEX "EscrowLedgerEntry_escrowId_createdAt_idx" ON "EscrowLedgerEntry"("escrowId", "createdAt");

CREATE TABLE "OrderDispute" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "openedById" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
  "resolution" "DisputeResolution",
  "resolutionNote" TEXT,
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderDispute_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderDispute_orderId_key" ON "OrderDispute"("orderId");

ALTER TABLE "OrderEscrow"
  ADD CONSTRAINT "OrderEscrow_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderEscrow"
  ADD CONSTRAINT "OrderEscrow_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EscrowLedgerEntry"
  ADD CONSTRAINT "EscrowLedgerEntry_escrowId_fkey"
  FOREIGN KEY ("escrowId") REFERENCES "OrderEscrow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EscrowLedgerEntry"
  ADD CONSTRAINT "EscrowLedgerEntry_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderDispute"
  ADD CONSTRAINT "OrderDispute_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing verified paid orders are brought into HELD, never auto-released.
WITH approved_payments AS (
  SELECT DISTINCT ON (o.id)
    o.id AS order_id,
    p.id AS payment_id,
    o.total,
    o."servicePrice",
    o.commission
  FROM "Order" o
  JOIN "Payment" p ON p."orderId" = o.id
  WHERE o.status IN ('PAID', 'IN_PROGRESS', 'DELIVERED', 'COMPLETED')
    AND p.status = 'APPROVED'
    AND p.amount = o.total
    AND o."servicePrice" + o.commission = o.total
  ORDER BY o.id, p."reviewedAt" DESC NULLS LAST, p."createdAt" DESC
)
INSERT INTO "OrderEscrow" (
  "id", "orderId", "paymentId", "amount", "providerAmount", "platformFee",
  "status", "createdAt", "updatedAt"
)
SELECT
  'legacy_escrow_' || md5(order_id),
  order_id,
  payment_id,
  total,
  "servicePrice",
  commission,
  'HELD',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM approved_payments;

INSERT INTO "EscrowLedgerEntry" (
  "id", "escrowId", "orderId", "type", "amount", "idempotencyKey",
  "actorId", "details", "createdAt"
)
SELECT
  'legacy_ledger_' || md5(e."orderId"),
  e.id,
  e."orderId",
  'HOLD',
  e.amount,
  'legacy:' || e."orderId" || ':HOLD',
  'system:migration',
  'ترحيل رصيد طلب مدفوع سابقًا إلى حالة HELD دون صرف تلقائي',
  CURRENT_TIMESTAMP
FROM "OrderEscrow" e;

INSERT INTO "AuditLog" ("id", "actorId", "action", "targetId", "details", "createdAt")
SELECT
  'legacy_audit_' || md5(e."orderId"),
  'system:migration',
  'LEGACY_ESCROW_BACKFILLED_HELD',
  e.id,
  'تم إنشاء سجل حجز محاسبي داخلي لطلب سابق؛ يلزم إجراء إداري يدوي قبل تسجيل أي صرف',
  CURRENT_TIMESTAMP
FROM "OrderEscrow" e;
