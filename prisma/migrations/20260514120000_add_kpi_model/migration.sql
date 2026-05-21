-- CreateTable
CREATE TABLE "Kpi" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "metricQuery" TEXT NOT NULL,
    "dataSourceType" TEXT NOT NULL DEFAULT 'GA4_BIGQUERY',
    "targetValue" DOUBLE PRECISION NOT NULL,
    "targetDirection" TEXT NOT NULL DEFAULT 'above',
    "timePeriod" TEXT NOT NULL DEFAULT 'monthly',
    "displayFormat" TEXT NOT NULL DEFAULT 'number',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kpi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Kpi_orgId_idx" ON "Kpi"("orgId");

-- AddForeignKey
ALTER TABLE "Kpi" ADD CONSTRAINT "Kpi_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
