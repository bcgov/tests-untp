-- BCMine port: per-organisation branding and stable credential seed keys
ALTER TABLE "OrganisationEntity" ADD COLUMN IF NOT EXISTS "logo" TEXT;
ALTER TABLE "OrganisationEntity" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT;
ALTER TABLE "Credential" ADD COLUMN IF NOT EXISTS "seedKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Credential_tenantId_seedKey_key" ON "Credential"("tenantId", "seedKey");
