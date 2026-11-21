ALTER TABLE "Order"
  ALTER COLUMN "commission" TYPE DECIMAL(12, 2) USING "commission"::DECIMAL(12, 2),
  ALTER COLUMN "providerNet" TYPE DECIMAL(12, 2) USING "providerNet"::DECIMAL(12, 2);

ALTER TABLE "Order"
  ALTER COLUMN "providerNet" SET DEFAULT 0.00;
