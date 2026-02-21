-- CreateEnum
CREATE TYPE "DatabaseBackupType" AS ENUM ('FULL', 'INCREMENTAL');

-- CreateEnum
CREATE TYPE "DatabaseBackupStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable (Phase 10: backup metadata)
CREATE TABLE "DatabaseBackup" (
    "id" UUID NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "size_bytes" BIGINT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "DatabaseBackupType" NOT NULL,
    "status" "DatabaseBackupStatus" NOT NULL,

    CONSTRAINT "DatabaseBackup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DatabaseBackup_created_at_idx" ON "DatabaseBackup"("created_at");

-- CreateIndex
CREATE INDEX "DatabaseBackup_type_idx" ON "DatabaseBackup"("type");

-- CreateIndex
CREATE INDEX "DatabaseBackup_status_idx" ON "DatabaseBackup"("status");

-- CreateTable (Phase 10: system configuration)
CREATE TABLE "SystemConfig" (
    "id" UUID NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "value" VARCHAR(512) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "SystemConfig_key_idx" ON "SystemConfig"("key");
