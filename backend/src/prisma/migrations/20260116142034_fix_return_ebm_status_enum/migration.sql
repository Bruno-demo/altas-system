/*
  Warnings:

  - The `ebmStatus` column on the `SaleReturn` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "SaleReturn" DROP COLUMN "ebmStatus",
ADD COLUMN     "ebmStatus" "EbmStatus" NOT NULL DEFAULT 'PENDING';
