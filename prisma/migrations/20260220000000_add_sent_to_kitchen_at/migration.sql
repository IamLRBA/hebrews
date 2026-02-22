-- Add sent_to_kitchen_at to Order: set when cashier clicks "Send to Kitchen"; status stays pending until kitchen clicks "Start Preparing"
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "sent_to_kitchen_at" TIMESTAMP(3);
