-- Add immutable provider earnings snapshot to each new order.
ALTER TABLE "Order" ADD COLUMN "providerNet" INTEGER NOT NULL DEFAULT 0;
-- Existing orders used servicePrice as the provider's listed amount; preserve that historical entitlement.
UPDATE "Order" SET "providerNet" = "servicePrice";
ALTER TABLE "Order" ALTER COLUMN "commissionRate" SET DEFAULT 20;
ALTER TABLE "PlatformSettings" ALTER COLUMN "commissionRate" SET DEFAULT 20;
-- The former default was a fixed 100 EG fee. New orders use a 20% share of the final customer price.
UPDATE "PlatformSettings" SET "commissionRate" = 20 WHERE "id" = 'main' AND "commissionRate" = 100;
