-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "interval" TEXT NOT NULL DEFAULT 'monthly',
    "maxUsers" INTEGER NOT NULL DEFAULT 1,
    "maxSessions" INTEGER NOT NULL DEFAULT 1,
    "maxCampaigns" INTEGER NOT NULL DEFAULT 10,
    "maxContacts" INTEGER NOT NULL DEFAULT 1000,
    "maxMessagesDay" INTEGER NOT NULL DEFAULT 500,
    "maxGroupsPerSession" INTEGER NOT NULL DEFAULT 50,
    "features" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logo" TEXT,
    "planId" TEXT NOT NULL,
    "planStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "planExpiresAt" TIMESTAMP(3),
    "billingEmail" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "trialEndsAt" TIMESTAMP(3),
    "maxUsers" INTEGER NOT NULL DEFAULT 1,
    "maxSessions" INTEGER NOT NULL DEFAULT 1,
    "maxCampaigns" INTEGER NOT NULL DEFAULT 10,
    "maxContacts" INTEGER NOT NULL DEFAULT 1000,
    "maxMessagesDay" INTEGER NOT NULL DEFAULT 500,
    "currentUsers" INTEGER NOT NULL DEFAULT 0,
    "currentSessions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
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

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "resource" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "messagesSent" INTEGER NOT NULL DEFAULT 0,
    "campaignsFired" INTEGER NOT NULL DEFAULT 0,
    "sessionsActive" INTEGER NOT NULL DEFAULT 0,
    "apiCalls" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageLog_pkey" PRIMARY KEY ("id")
);

-- AlterTable User - Add organizationId and new fields
ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lastLoginIp" TEXT;
ALTER TABLE "User" ADD COLUMN "permissions" JSONB;
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "Organization_domain_key" ON "Organization"("domain");
CREATE INDEX "Organization_planId_idx" ON "Organization"("planId");
CREATE INDEX "Subscription_organizationId_status_idx" ON "Subscription"("organizationId", "status");
CREATE INDEX "ActivityLog_organizationId_timestamp_idx" ON "ActivityLog"("organizationId", "timestamp");
CREATE INDEX "ActivityLog_userId_timestamp_idx" ON "ActivityLog"("userId", "timestamp");
CREATE INDEX "ActivityLog_action_timestamp_idx" ON "ActivityLog"("action", "timestamp");
CREATE UNIQUE INDEX "UsageLog_organizationId_date_key" ON "UsageLog"("organizationId", "date");
CREATE INDEX "UsageLog_organizationId_date_idx" ON "UsageLog"("organizationId", "date");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageLog" ADD CONSTRAINT "UsageLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed: Create default plan
INSERT INTO "Plan" (id, name, slug, description, price, "maxUsers", "maxSessions", "maxCampaigns", "maxContacts", "maxMessagesDay", "createdAt", "updatedAt")
VALUES (
  'plan_free_default',
  'Free',
  'free',
  'Plano gratuito com recursos básicos',
  0,
  5,
  3,
  50,
  5000,
  500,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Seed: Create default organization
INSERT INTO "Organization" (id, name, slug, "planId", "billingEmail", status, "maxUsers", "maxSessions", "maxCampaigns", "maxContacts", "maxMessagesDay", "createdAt", "updatedAt")
VALUES (
  'org_default',
  'Organização Principal',
  'main',
  'plan_free_default',
  'admin@kscsm.com',
  'active',
  5,
  3,
  50,
  5000,
  500,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Update existing users to belong to default organization
UPDATE "User" SET "organizationId" = 'org_default' WHERE "organizationId" IS NULL;

-- Make organizationId required
ALTER TABLE "User" ALTER COLUMN "organizationId" SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update first user to super_admin
UPDATE "User" SET role = 'super_admin' WHERE email = 'admin@kscsm.com';
