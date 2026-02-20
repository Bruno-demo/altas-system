-- DropForeignKey
ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_binId_fkey";

-- AlterTable
ALTER TABLE "SaleItem" ALTER COLUMN "binId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_binId_fkey" FOREIGN KEY ("binId") REFERENCES "StorageBin"("id") ON DELETE SET NULL ON UPDATE CASCADE;
