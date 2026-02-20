/*
  Warnings:

  - The `ebmStatus` column on the `Sale` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EbmStatus" AS ENUM ('PENDING', 'SIGNED', 'FAILED', 'CANCELLED', 'CREDITED', 'NOT_REQUIRED');

-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "ebmStatus",
ADD COLUMN     "ebmStatus" "EbmStatus" NOT NULL DEFAULT 'PENDING';
