-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "ebmDeviceId" TEXT,
ADD COLUMN     "ebmQrPayload" TEXT,
ADD COLUMN     "ebmSignature" TEXT,
ADD COLUMN     "ebmStatus" TEXT NOT NULL DEFAULT 'PENDING';
