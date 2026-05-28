-- CreateTable
CREATE TABLE "ManualMetric" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayFormat" TEXT NOT NULL DEFAULT 'number',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualMetricEntry" (
    "id" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualMetricEntry_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add optional manualMetricId to Kpi
ALTER TABLE "Kpi" ADD COLUMN "manualMetricId" TEXT;

-- CreateIndex
CREATE INDEX "ManualMetric_orgId_idx" ON "ManualMetric"("orgId");

-- CreateIndex
CREATE INDEX "ManualMetricEntry_metricId_idx" ON "ManualMetricEntry"("metricId");

-- CreateIndex
CREATE UNIQUE INDEX "ManualMetricEntry_metricId_period_key" ON "ManualMetricEntry"("metricId", "period");

-- AddForeignKey
ALTER TABLE "ManualMetric" ADD CONSTRAINT "ManualMetric_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualMetricEntry" ADD CONSTRAINT "ManualMetricEntry_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "ManualMetric"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_manualMetricId_fkey" FOREIGN KEY ("manualMetricId") REFERENCES "ManualMetric"("id") ON DELETE SET NULL ON UPDATE CASCADE;
