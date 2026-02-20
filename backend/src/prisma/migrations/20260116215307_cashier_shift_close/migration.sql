-- CreateEnum
CREATE TYPE "ShiftStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "shiftId" TEXT;

-- CreateTable
CREATE TABLE "CashierShift" (
    "id" TEXT NOT NULL,
    "cashierId" TEXT NOT NULL,
    "status" "ShiftStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "note" TEXT,
    "expectedCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expectedMomo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expectedCard" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expectedBank" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expectedOther" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "expectedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "countedCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "countedMomo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "countedCard" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "countedBank" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "countedOther" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "countedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "diffCash" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "diffMomo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "diffCard" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "diffBank" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "diffOther" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "diffTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashierShift_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CashierShift" ADD CONSTRAINT "CashierShift_cashierId_fkey" FOREIGN KEY ("cashierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "CashierShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
