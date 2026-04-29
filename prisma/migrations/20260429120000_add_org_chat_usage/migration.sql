-- CreateTable
CREATE TABLE "OrgChatUsage" (
    "orgId" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrgChatUsage_pkey" PRIMARY KEY ("orgId", "yearMonth")
);

-- CreateIndex
CREATE INDEX "OrgChatUsage_orgId_idx" ON "OrgChatUsage"("orgId");

-- AddForeignKey
ALTER TABLE "OrgChatUsage" ADD CONSTRAINT "OrgChatUsage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
