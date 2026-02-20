/*
  Warnings:

  - A unique constraint covering the columns `[productId,locationId,binId]` on the table `Inventory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Inventory_productId_locationId_key";

-- AlterTable
ALTER TABLE "Inventory" ADD COLUMN     "binId" TEXT;

-- CreateTable
CREATE TABLE "StorageBin" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "locationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageBin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorageBin_code_key" ON "StorageBin"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_productId_locationId_binId_key" ON "Inventory"("productId", "locationId", "binId");

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_binId_fkey" FOREIGN KEY ("binId") REFERENCES "StorageBin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorageBin" ADD CONSTRAINT "StorageBin_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
