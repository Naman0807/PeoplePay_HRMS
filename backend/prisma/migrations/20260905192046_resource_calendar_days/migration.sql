-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

-- CreateTable
CREATE TABLE "resource_calendar_days" (
    "id" SERIAL NOT NULL,
    "resource_calendar_id" INTEGER NOT NULL,
    "day" "Weekday" NOT NULL,
    "start_time" VARCHAR(5) NOT NULL,
    "end_time" VARCHAR(5) NOT NULL,
    "break_minutes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "resource_calendar_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "resource_calendar_days_resource_calendar_id_day_key" ON "resource_calendar_days"("resource_calendar_id", "day");

-- AddForeignKey
ALTER TABLE "resource_calendar_days" ADD CONSTRAINT "resource_calendar_days_resource_calendar_id_fkey" FOREIGN KEY ("resource_calendar_id") REFERENCES "resource_calendars"("id") ON DELETE CASCADE ON UPDATE CASCADE;
