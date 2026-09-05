-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "requested_role" "UserRole";
