/*
  Warnings:

  - You are about to drop the column `ebmDeviceId` on the `Sale` table. All the data in the column will be lost.
  - You are about to drop the column `ebmSignature` on the `Sale` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Sale" DROP COLUMN "ebmDeviceId",
DROP COLUMN "ebmSignature",
ADD COLUMN     "ebmIssuedAt" TIMESTAMP(3),
ADD COLUMN     "ebmReceiptSignature" TEXT;
