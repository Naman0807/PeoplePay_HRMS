-- CreateEnum
CREATE TYPE "PayrunEmployeeStatus" AS ENUM ('PENDING', 'COMPUTED', 'PAID');

-- AlterTable
ALTER TABLE "PayrunEmployee" ADD COLUMN     "base_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "gross_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "net_salary" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "status" "PayrunEmployeeStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "total_deductions" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_name" TEXT;
