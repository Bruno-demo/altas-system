-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "checkInTime" TIMESTAMP(3),
ADD COLUMN     "isLate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateMinutes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "PayrollItem" ADD COLUMN     "lateCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lateDeduction" DECIMAL(12,2) NOT NULL DEFAULT 0;
