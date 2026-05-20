-- Enable Row Level Security on SyncLog and OrgChatUsage tables
-- These tables are accessed server-side via Prisma (service role), which bypasses RLS.
-- No policies needed since no client-side (anon/authenticated) access is intended.

ALTER TABLE "SyncLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrgChatUsage" ENABLE ROW LEVEL SECURITY;
