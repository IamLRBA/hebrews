-- CreateTable (Phase 9: table ownership — which terminal/staff has the table locked for an order)
CREATE TABLE "TableOccupancy" (
    "id" UUID NOT NULL,
    "table_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "terminal_id" VARCHAR(32) NOT NULL,
    "staff_id" UUID NOT NULL,
    "locked_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TableOccupancy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TableOccupancy_table_id_key" ON "TableOccupancy"("table_id");

-- CreateIndex
CREATE INDEX "TableOccupancy_table_id_idx" ON "TableOccupancy"("table_id");

-- CreateIndex
CREATE INDEX "TableOccupancy_order_id_idx" ON "TableOccupancy"("order_id");

-- CreateIndex
CREATE INDEX "TableOccupancy_terminal_id_idx" ON "TableOccupancy"("terminal_id");

-- AddForeignKey
ALTER TABLE "TableOccupancy" ADD CONSTRAINT "TableOccupancy_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "RestaurantTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
