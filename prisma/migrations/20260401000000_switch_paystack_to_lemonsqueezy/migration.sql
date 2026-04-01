-- User: replace Paystack fields with LemonSqueezy
ALTER TABLE "User" DROP COLUMN IF EXISTS "paystackCustomerCode";
ALTER TABLE "User" DROP COLUMN IF EXISTS "paystackAuthorizationCode";
ALTER TABLE "User" ADD COLUMN "lsCustomerId" TEXT;

-- Subscription: replace Paystack fields with LemonSqueezy
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "paystackSubscriptionCode";
ALTER TABLE "Subscription" DROP COLUMN IF EXISTS "paystackEmailToken";
ALTER TABLE "Subscription" ADD COLUMN "lsSubscriptionId" TEXT;

-- Payment: rename paystackReference -> reference, add lsOrderId, drop paystackTransactionId
ALTER TABLE "Payment" ADD COLUMN "lsOrderId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "reference" TEXT;

-- Copy existing data from paystackReference to reference
UPDATE "Payment" SET "reference" = "paystackReference" WHERE "paystackReference" IS NOT NULL;

-- Drop old unique constraint on paystackReference and create new one on reference
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_paystackReference_key";
ALTER TABLE "Payment" ALTER COLUMN "reference" SET NOT NULL;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_reference_key" UNIQUE ("reference");

-- Drop old Paystack columns from Payment
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "paystackReference";
ALTER TABLE "Payment" DROP COLUMN IF EXISTS "paystackTransactionId";
