/*
  Warnings:

  - You are about to drop the column `compatibility` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "compatibility",
ADD COLUMN     "modelCompatibility" TEXT;
