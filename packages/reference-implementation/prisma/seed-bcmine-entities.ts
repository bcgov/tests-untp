import fs from 'fs';
import path from 'path';
import type { LoggerService as Logger } from '@uncefact/untp-ri-services';
import type { PrismaClient, ProductLevel } from '../src/lib/prisma/generated/index.js';
import { createIdentifier } from '../src/lib/prisma/repositories/identifier.repository.js';
import { createFacilities } from '../src/lib/prisma/repositories/facility.repository.js';
import { createProducts } from '../src/lib/prisma/repositories/product.repository.js';

export type BcmineEntitiesFile = {
  facilities?: Array<{
    key: string;
    name: string;
    description?: string;
    organisationName: string;
    schemePrimaryKey: string;
    identifierValue: string;
    registrarNamespace?: string;
  }>;
  products?: Array<{
    key: string;
    name: string;
    description?: string;
    level: 'MODEL' | 'BATCH' | 'ITEM';
    organisationName: string;
    facilityName?: string;
    schemePrimaryKey: string;
    identifierValue: string;
    registrarNamespace?: string;
    batchNumber?: string;
    serialNumber?: string;
  }>;
};

export type BcmineEntitySeedDependencies = {
  prisma: PrismaClient;
  logger: Logger;
  tenantId: string;
  bcmineDir: string;
};

function loadEntities(bcmineDir: string): BcmineEntitiesFile | null {
  const entitiesPath = path.join(bcmineDir, 'entities.json');
  if (!fs.existsSync(entitiesPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(entitiesPath, 'utf-8')) as BcmineEntitiesFile;
}

async function resolveSchemeId(
  prisma: PrismaClient,
  tenantId: string,
  schemePrimaryKey: string,
  logger: Logger,
  registrarNamespace = 'gs1',
): Promise<string | null> {
  const scheme = await prisma.identifierScheme.findFirst({
    where: {
      tenantId,
      primaryKey: schemePrimaryKey,
      registrar: { namespace: registrarNamespace },
    },
  });
  if (!scheme) {
    logger.warn(
      { schemePrimaryKey, tenantId },
      'BCMine entity seed: GS1 scheme not found — run custom seed (seed.yaml registrars) first',
    );
    return null;
  }
  return scheme.id;
}

async function findOrCreateIdentifier(
  prisma: PrismaClient,
  tenantId: string,
  schemeId: string,
  value: string,
): Promise<string> {
  const existing = await prisma.identifier.findFirst({
    where: { tenantId, schemeId, value },
  });
  if (existing) {
    return existing.id;
  }
  const created = await createIdentifier({ tenantId, schemeId, value });
  return created.id;
}

/**
 * Layer 3c: seed BCMine facilities and products with GS1 identifiers (pyx demo IDs).
 * Idempotent by entity name + tenant. Requires GS1 schemes from bcmine custom seed.
 */
export async function runBcmineEntitySeed(deps: BcmineEntitySeedDependencies): Promise<void> {
  const { prisma, logger, tenantId, bcmineDir } = deps;
  const manifest = loadEntities(bcmineDir);
  if (!manifest) {
    logger.info({ bcmineDir }, 'No entities.json in BCMine seed dir — skipping BCMine entity seed');
    return;
  }

  let facilitiesCreated = 0;
  let facilitiesSkipped = 0;
  let productsCreated = 0;
  let productsSkipped = 0;

  for (const entry of manifest.facilities ?? []) {
    try {
      const organisation = await prisma.organisationEntity.findFirst({
        where: { tenantId, name: entry.organisationName },
      });
      if (!organisation) {
        logger.warn({ key: entry.key, organisationName: entry.organisationName }, 'Facility seed: organisation missing');
        continue;
      }

      const existing = await prisma.facility.findFirst({
        where: { tenantId, name: entry.name },
      });
      if (existing) {
        facilitiesSkipped++;
        continue;
      }

      const schemeId = await resolveSchemeId(
        prisma,
        tenantId,
        entry.schemePrimaryKey,
        logger,
        entry.registrarNamespace,
      );
      if (!schemeId) continue;

      const primaryIdentifierId = await findOrCreateIdentifier(
        prisma,
        tenantId,
        schemeId,
        entry.identifierValue,
      );

      await createFacilities(tenantId, [
        {
          name: entry.name,
          description: entry.description,
          operatingOrganisationId: organisation.id,
          primaryIdentifierId,
        },
      ]);
      facilitiesCreated++;
    } catch (error) {
      logger.warn(
        { key: entry.key, error: error instanceof Error ? error.message : error },
        'BCMine facility seed entry failed',
      );
    }
  }

  for (const entry of manifest.products ?? []) {
    try {
      const organisation = await prisma.organisationEntity.findFirst({
        where: { tenantId, name: entry.organisationName },
      });
      if (!organisation) {
        logger.warn({ key: entry.key, organisationName: entry.organisationName }, 'Product seed: organisation missing');
        continue;
      }

      const existing = await prisma.product.findFirst({
        where: { tenantId, name: entry.name },
      });
      if (existing) {
        productsSkipped++;
        continue;
      }

      const schemeId = await resolveSchemeId(
        prisma,
        tenantId,
        entry.schemePrimaryKey,
        logger,
        entry.registrarNamespace,
      );
      if (!schemeId) continue;

      const primaryIdentifierId = await findOrCreateIdentifier(
        prisma,
        tenantId,
        schemeId,
        entry.identifierValue,
      );

      let manufacturingFacilityId: string | undefined;
      if (entry.facilityName) {
        const facility = await prisma.facility.findFirst({
          where: { tenantId, name: entry.facilityName },
        });
        manufacturingFacilityId = facility?.id;
      }

      await createProducts(tenantId, [
        {
          name: entry.name,
          description: entry.description,
          level: entry.level as ProductLevel,
          producedByOrganisationId: organisation.id,
          manufacturingFacilityId,
          primaryIdentifierId,
          batchNumber: entry.batchNumber,
          serialNumber: entry.serialNumber,
        },
      ]);
      productsCreated++;
    } catch (error) {
      logger.warn(
        { key: entry.key, error: error instanceof Error ? error.message : error },
        'BCMine product seed entry failed',
      );
    }
  }

  logger.info(
    {
      tenantId,
      facilitiesCreated,
      facilitiesSkipped,
      productsCreated,
      productsSkipped,
    },
    'BCMine entity seed complete',
  );
}
