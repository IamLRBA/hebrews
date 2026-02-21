-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "client_request_id" VARCHAR(64) NOT NULL,
    "resource_type" VARCHAR(32) NOT NULL,
    "response_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_client_request_id_key" ON "idempotency_records"("client_request_id");

-- CreateIndex
CREATE INDEX "idempotency_records_client_request_id_idx" ON "idempotency_records"("client_request_id");
