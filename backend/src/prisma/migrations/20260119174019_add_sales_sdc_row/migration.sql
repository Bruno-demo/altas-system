-- CreateTable
CREATE TABLE "SalesSdcRow" (
    "id" TEXT NOT NULL,
    "sdcId" TEXT NOT NULL,
    "buyerTin" TEXT,
    "buyerName" TEXT,
    "saleDate" TIMESTAMP(3),
    "receiptType" TEXT,
    "itemName" TEXT,
    "quantity" DECIMAL(14,3),
    "unitPrice" DECIMAL(18,2),
    "taxableSupplyPrice" DECIMAL(18,2),
    "vat" DECIMAL(18,2),
    "summaryAmount" DECIMAL(18,2),
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesSdcRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesSdcRow_saleDate_idx" ON "SalesSdcRow"("saleDate");

-- CreateIndex
CREATE UNIQUE INDEX "SalesSdcRow_sdcId_itemName_key" ON "SalesSdcRow"("sdcId", "itemName");

-- AddForeignKey
ALTER TABLE "SalesSdcRow" ADD CONSTRAINT "SalesSdcRow_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
