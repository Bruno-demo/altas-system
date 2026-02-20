-- CreateEnum
CREATE TYPE "BuyerType" AS ENUM ('INDIVIDUAL', 'COMPANY');

-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "buyerName" TEXT,
ADD COLUMN     "buyerPhone" TEXT,
ADD COLUMN     "buyerTin" TEXT,
ADD COLUMN     "buyerType" "BuyerType" NOT NULL DEFAULT 'INDIVIDUAL';
