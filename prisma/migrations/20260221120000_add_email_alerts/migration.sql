-- CreateTable
CREATE TABLE "EmailAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipients" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "propertyId" TEXT,
    "propertyName" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmailAlert_userId_idx" ON "EmailAlert"("userId");

-- CreateIndex
CREATE INDEX "EmailAlert_enabled_frequency_idx" ON "EmailAlert"("enabled", "frequency");

-- AddForeignKey
ALTER TABLE "EmailAlert" ADD CONSTRAINT "EmailAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
