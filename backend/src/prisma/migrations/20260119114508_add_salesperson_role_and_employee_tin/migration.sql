/*
  Warnings:

  - A unique constraint covering the columns `[tin]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SALESPERSON';

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "tin" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_tin_key" ON "Employee"("tin");
