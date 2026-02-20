/*
  Warnings:

  - A unique constraint covering the columns `[chassisNumber]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "branchName" TEXT,
ADD COLUMN     "chassisNumber" TEXT,
ADD COLUMN     "color" TEXT,
ADD COLUMN     "modelYear" INTEGER,
ADD COLUMN     "weightKg" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "MotorbikePromotion" (
    "id" TEXT NOT NULL,
    "countingNumber" TEXT,
    "date" TIMESTAMP(3),
    "customerName" TEXT,
    "chassisNumber" TEXT NOT NULL,
    "plateNumber" TEXT,
    "model" TEXT,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "stubPaid" BOOLEAN NOT NULL DEFAULT false,
    "branchName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MotorbikePromotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MotorbikePromotion_chassisNumber_key" ON "MotorbikePromotion"("chassisNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Product_chassisNumber_key" ON "Product"("chassisNumber");
