/*
  Warnings:

  - A unique constraint covering the columns `[ebmInvoiceNo]` on the table `Sale` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "ebmInvoiceNo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sale_ebmInvoiceNo_key" ON "Sale"("ebmInvoiceNo");
