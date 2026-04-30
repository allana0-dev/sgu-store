-- Add missing checkout detail columns to Order table.
ALTER TABLE "Order" ADD COLUMN "fulfillmentMethod" TEXT NOT NULL DEFAULT 'PICKUP';
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT NOT NULL DEFAULT 'PAY_ON_ARRIVAL';
ALTER TABLE "Order" ADD COLUMN "deliveryAddress" TEXT;
ALTER TABLE "Order" ADD COLUMN "pickupLocation" TEXT;
ALTER TABLE "Order" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN "notes" TEXT;
ALTER TABLE "Order" ADD COLUMN "cardholderName" TEXT;
ALTER TABLE "Order" ADD COLUMN "cardLast4" TEXT;
