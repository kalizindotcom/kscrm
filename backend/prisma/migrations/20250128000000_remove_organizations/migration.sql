-- Migration: Remove Organizations and link Users directly to Plans
-- This migration removes the Organization model and restructures the system
-- so that users are directly linked to plans via subscriptions.

-- Step 1: Create new Subscription table structure (if not exists)
CREATE TABLE IF NOT EXISTS "Subscription_new" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentStatus" TEXT,
    "amount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Step 2: Migrate existing subscriptions to new structure
-- (This assumes you want to keep subscription data)
INSERT INTO "Subscription_new" ("id", "userId", "planId", "status", "startedAt", "expiresAt", "cancelledAt", "paymentMethod", "paymentStatus", "amount", "createdAt", "updatedAt")
SELECT
    s."id",
    u."id" as "userId",
    s."planId",
    s."status",
    s."startedAt",
    s."expiresAt",
    s."cancelledAt",
    s."paymentMethod",
    s."paymentStatus",
    s."amount",
    s."createdAt",
    s."updatedAt"
FROM "Subscription" s
INNER JOIN "User" u ON u."organizationId" = s."organizationId"
WHERE NOT EXISTS (
    SELECT 1 FROM "Subscription_new" sn WHERE sn."userId" = u."id"
)
LIMIT 1;

-- Step 3: Drop old Subscription table and rename new one
DROP TABLE IF EXISTS "Subscription";
ALTER TABLE "Subscription_new" RENAME TO "Subscription";

-- Step 4: Create indexes for new Subscription table
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription"("userId", "status");

-- Step 5: Update UsageLog to reference userId instead of organizationId
ALTER TABLE "UsageLog" DROP CONSTRAINT IF EXISTS "UsageLog_organizationId_fkey";
ALTER TABLE "UsageLog" ADD COLUMN "userId_new" TEXT;

-- Migrate usage logs to users (taking first user from each organization)
UPDATE "UsageLog" ul
SET "userId_new" = (
    SELECT u."id"
    FROM "User" u
    WHERE u."organizationId" = ul."organizationId"
    LIMIT 1
);

-- Drop old organizationId column and rename new one
ALTER TABLE "UsageLog" DROP COLUMN "organizationId";
ALTER TABLE "UsageLog" RENAME COLUMN "userId_new" TO "userId";
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate unique constraint
DROP INDEX IF EXISTS "UsageLog_organizationId_date_key";
CREATE UNIQUE INDEX "UsageLog_userId_date_key" ON "UsageLog"("userId", "date");
CREATE INDEX "UsageLog_userId_date_idx" ON "UsageLog"("userId", "date");

-- Step 6: Update ActivityLog to remove organizationId
ALTER TABLE "ActivityLog" DROP CONSTRAINT IF EXISTS "ActivityLog_organizationId_fkey";
ALTER TABLE "ActivityLog" DROP COLUMN IF EXISTS "organizationId";

-- Recreate indexes
DROP INDEX IF EXISTS "ActivityLog_organizationId_timestamp_idx";
CREATE INDEX "ActivityLog_userId_timestamp_idx" ON "ActivityLog"("userId", "timestamp");

-- Step 7: Remove organizationId from User table
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_organizationId_fkey";
DROP INDEX IF EXISTS "User_organizationId_idx";
ALTER TABLE "User" DROP COLUMN IF EXISTS "organizationId";

-- Step 8: Drop Organization table and related tables
DROP TABLE IF EXISTS "Organization" CASCADE;

-- Step 9: Update Plan table to remove organization references
-- (Plan table structure remains mostly the same, just remove the relation)
-- No changes needed as Plan doesn't directly reference Organization

-- Step 10: Clean up any orphaned data
DELETE FROM "Subscription" WHERE "userId" NOT IN (SELECT "id" FROM "User");
DELETE FROM "UsageLog" WHERE "userId" NOT IN (SELECT "id" FROM "User");
DELETE FROM "ActivityLog" WHERE "userId" IS NOT NULL AND "userId" NOT IN (SELECT "id" FROM "User");
