/*
  Warnings:

  - A unique constraint covering the columns `[employeeCode]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `employeeCode` to the `Employee` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('STAFF', 'TRAINEE');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "employeeCode" TEXT NOT NULL,
ADD COLUMN     "employmentType" "EmploymentType" NOT NULL DEFAULT 'STAFF',
ADD COLUMN     "hireDate" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");
