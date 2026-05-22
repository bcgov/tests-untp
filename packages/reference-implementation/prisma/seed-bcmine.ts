import fs from 'fs';
import path from 'path';
import type { LoggerService as Logger } from '@uncefact/untp-ri-services';
import type { PrismaClient } from '../src/lib/prisma/generated/index.js';
import { createIdentifier } from '../src/lib/prisma/repositories/identifier.repository.js';

export type BcmineActorIdentifier = {
  registrarNamespace: string;
  schemePrimaryKey: string;
  value: string;
};

export type BcmineActorsFile = {
  chainName: string;
  styles?: {
    primaryColor?: string;
    secondaryColor?: string;
    tertiaryColor?: string;
  };
  actors: Array<{
    name: string;
    type?: string;
    primaryColor?: string;
    logo?: string;
    brandTitle?: string;
    primaryIdentifier?: BcmineActorIdentifier;
  }>;
};

export type BcmineSeedDependencies = {
  prisma: PrismaClient;
  logger: Logger;
  tenantId: string;
  bcmineDir: string;
};

function loadActors(bcmineDir: string): BcmineActorsFile | null {
  const actorsPath = path.join(bcmineDir, 'actors.json');
  if (!fs.existsSync(actorsPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(actorsPath, 'utf-8')) as BcmineActorsFile;
}

async function resolveSchemeId(
  prisma: PrismaClient,
  tenantId: string,
  schemePrimaryKey: string,
  registrarNamespace: string,
): Promise<string | null> {
  const scheme = await prisma.identifierScheme.findFirst({
    where: { tenantId, primaryKey: schemePrimaryKey, registrar: { namespace: registrarNamespace } },
  });
  return scheme?.id ?? null;
}

async function ensureOrganisationPrimaryIdentifier(
  prisma: PrismaClient,
  tenantId: string,
  organisationId: string,
  spec: BcmineActorIdentifier,
  logger: Logger,
): Promise<void> {
  const schemeId = await resolveSchemeId(prisma, tenantId, spec.schemePrimaryKey, spec.registrarNamespace);
  if (!schemeId) {
    logger.warn({ spec }, 'BCMine org identifier: scheme not found');
    return;
  }

  const existingIdent = await prisma.identifier.findFirst({
    where: { tenantId, schemeId, value: spec.value },
  });
  const identifierId =
    existingIdent?.id ??
    (
      await createIdentifier({
        tenantId,
        schemeId,
        value: spec.value,
      })
    ).id;

  const org = await prisma.organisationEntity.findFirst({ where: { id: organisationId, tenantId } });
  if (org && !org.primaryIdentifierId) {
    await prisma.organisationEntity.update({
      where: { id: organisationId },
      data: { primaryIdentifierId: identifierId },
    });
  }
}

/**
 * Layer 3b: seed BCMine supply-chain actors as OrganisationEntity rows on the system tenant.
 * Idempotent — updates branding and ABN identifiers on re-seed.
 */
export async function runBcmineDataSeed(deps: BcmineSeedDependencies): Promise<void> {
  const { prisma, logger, tenantId, bcmineDir } = deps;
  const manifest = loadActors(bcmineDir);
  if (!manifest) {
    logger.info({ bcmineDir }, 'No actors.json in BCMine seed dir — skipping BCMine data seed');
    return;
  }

  if (manifest.styles?.primaryColor) {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        primaryColor: manifest.styles.primaryColor,
        secondaryColor: manifest.styles.secondaryColor ?? undefined,
      },
    });
    logger.info({ tenantId }, 'Updated system tenant colours from BCMine actors.json');
  }

  let created = 0;
  let updated = 0;

  for (const actor of manifest.actors) {
    const description = [actor.brandTitle, actor.type].filter(Boolean).join(' · ') || manifest.chainName;
    const branding = {
      description,
      logo: actor.logo ?? undefined,
      primaryColor: actor.primaryColor ?? undefined,
    };

    const existing = await prisma.organisationEntity.findFirst({
      where: { tenantId, name: actor.name },
    });

    let organisationId: string;
    if (existing) {
      await prisma.organisationEntity.update({
        where: { id: existing.id },
        data: branding,
      });
      organisationId = existing.id;
      updated++;
    } else {
      const row = await prisma.organisationEntity.create({
        data: {
          tenantId,
          name: actor.name,
          ...branding,
        },
      });
      organisationId = row.id;
      created++;
    }

    if (actor.primaryIdentifier) {
      await ensureOrganisationPrimaryIdentifier(prisma, tenantId, organisationId, actor.primaryIdentifier, logger);
    }
  }

  logger.info(
    { tenantId, created, updated, total: manifest.actors.length, chainName: manifest.chainName },
    'BCMine organisation seed complete',
  );
}
