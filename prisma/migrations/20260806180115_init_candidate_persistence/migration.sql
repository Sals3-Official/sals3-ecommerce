-- CreateEnum
CREATE TYPE "Supplier" AS ENUM ('CJ_DROPSHIPPING');

-- CreateEnum
CREATE TYPE "ShortlistState" AS ENUM ('SHORTLISTED', 'PREFLIGHT_PENDING');

-- CreateTable
CREATE TABLE "SupplierCandidate" (
    "id" TEXT NOT NULL,
    "supplier" "Supplier" NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "intendedSellerId" TEXT NOT NULL,
    "intendedMarketCodes" TEXT[],
    "shortlistState" "ShortlistState" NOT NULL DEFAULT 'SHORTLISTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "resultReference" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierCandidate_intendedSellerId_idx" ON "SupplierCandidate"("intendedSellerId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCandidate_supplier_externalProductId_key" ON "SupplierCandidate"("supplier", "externalProductId");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_key_key" ON "IdempotencyRecord"("key");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");
