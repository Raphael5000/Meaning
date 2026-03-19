-- Add new schedule columns with defaults
ALTER TABLE "EmailAlert" ADD COLUMN "sendDays" TEXT[] NOT NULL DEFAULT ARRAY['monday']::TEXT[];
ALTER TABLE "EmailAlert" ADD COLUMN "sendHour" INTEGER NOT NULL DEFAULT 9;
ALTER TABLE "EmailAlert" ADD COLUMN "sendMinute" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "EmailAlert" ADD COLUMN "intervalWeeks" INTEGER NOT NULL DEFAULT 1;

-- Migrate existing frequency values to new schedule fields
-- daily → all 7 days, intervalWeeks=1
UPDATE "EmailAlert"
SET "sendDays" = ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday']::TEXT[],
    "intervalWeeks" = 1
WHERE "frequency" = 'daily';

-- weekly → monday only, intervalWeeks=1
UPDATE "EmailAlert"
SET "sendDays" = ARRAY['monday']::TEXT[],
    "intervalWeeks" = 1
WHERE "frequency" = 'weekly';

-- monthly → monday only, intervalWeeks=4
UPDATE "EmailAlert"
SET "sendDays" = ARRAY['monday']::TEXT[],
    "intervalWeeks" = 4
WHERE "frequency" = 'monthly';

-- Drop old frequency column
ALTER TABLE "EmailAlert" DROP COLUMN "frequency";

-- Drop old index and create new one
DROP INDEX IF EXISTS "EmailAlert_enabled_frequency_idx";
CREATE INDEX "EmailAlert_enabled_sendHour_idx" ON "EmailAlert"("enabled", "sendHour");
