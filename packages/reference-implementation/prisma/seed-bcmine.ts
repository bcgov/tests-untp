import fs from 'fs';
import path from 'path';
import type { LoggerService as Logger } from '@uncefact/untp-ri-services';
import type { PrismaClient } from '../src/lib/prisma/generated/index.js';

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

/**
 * Layer 3b: seed BCMine supply-chain actors as OrganisationEntity rows on the system tenant.
 * Idempotent — skips organisations that already exist by name.
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
  let skipped = 0;

  for (const actor of manifest.actors) {
    const existing = await prisma.organisationEntity.findFirst({
      where: { tenantId, name: actor.name },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const description = [actor.brandTitle, actor.type].filter(Boolean).join(' · ') || manifest.chainName;

    await prisma.organisationEntity.create({
      data: {
        tenantId,
        name: actor.name,
        description,
      },
    });
    created++;
  }

  logger.info(
    { tenantId, created, skipped, total: manifest.actors.length, chainName: manifest.chainName },
    'BCMine organisation seed complete',
  );
}
