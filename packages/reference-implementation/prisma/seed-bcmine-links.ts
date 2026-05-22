import fs from 'fs';
import path from 'path';
import type { IIdentityResolverService, Link, LoggerService as Logger } from '@uncefact/untp-ri-services';
import type { PrismaClient } from '../src/lib/prisma/generated/index.js';
import { createManyLinkRegistrations } from '../src/lib/prisma/repositories/link-registration.repository.js';

export type BcmineLinksFile = {
  links: Array<{
    key: string;
    credentialSeedKey: string;
    namespace: string;
    schemePrimaryKey: string;
    identifierValue: string;
    qualifierPath?: string;
    linkType: string;
    title: string;
    mimeType?: string;
  }>;
};

export type BcmineLinkSeedDependencies = {
  prisma: PrismaClient;
  logger: Logger;
  tenantId: string;
  bcmineDir: string;
  idrService: IIdentityResolverService;
  publicBaseUrl: string;
};

function loadLinks(bcmineDir: string): BcmineLinksFile | null {
  const linksPath = path.join(bcmineDir, 'links.json');
  if (!fs.existsSync(linksPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(linksPath, 'utf-8')) as BcmineLinksFile;
}

function buildVerifyUrl(
  baseUrl: string,
  storageUri: string,
  digestMultibase: string,
  decryptionKey?: string | null,
): string {
  const params = new URLSearchParams({ uri: storageUri, digestMultibase });
  if (decryptionKey) {
    params.set('decryptionKey', decryptionKey);
  }
  return `${baseUrl.replace(/\/$/, '')}/verify?${params.toString()}`;
}

/**
 * Publishes IDR links for seeded identifiers, pointing at RI verify URLs for seeded credentials.
 */
export async function runBcmineLinkSeed(deps: BcmineLinkSeedDependencies): Promise<void> {
  const { prisma, logger, tenantId, bcmineDir, idrService, publicBaseUrl } = deps;
  const manifest = loadLinks(bcmineDir);
  if (!manifest?.links?.length) {
    logger.info({ bcmineDir }, 'No links.json in BCMine seed dir — skipping BCMine link seed');
    return;
  }

  let published = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of manifest.links) {
    try {
      const existing = await prisma.linkRegistration.findFirst({
        where: { tenantId, idrLinkId: entry.key },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const credential = await prisma.credential.findFirst({
        where: { tenantId, seedKey: entry.credentialSeedKey },
      });
      if (!credential) {
        logger.warn(
          { key: entry.key, credentialSeedKey: entry.credentialSeedKey },
          'Link seed: credential not found — run credential seed first',
        );
        failed++;
        continue;
      }

      const scheme = await prisma.identifierScheme.findFirst({
        where: {
          tenantId,
          primaryKey: entry.schemePrimaryKey,
          registrar: { namespace: entry.namespace },
        },
      });
      if (!scheme) {
        logger.warn({ key: entry.key, schemePrimaryKey: entry.schemePrimaryKey }, 'Link seed: scheme not found');
        failed++;
        continue;
      }

      const identifier = await prisma.identifier.findFirst({
        where: { tenantId, schemeId: scheme.id, value: entry.identifierValue },
      });
      if (!identifier) {
        logger.warn({ key: entry.key, identifierValue: entry.identifierValue }, 'Link seed: identifier not found');
        failed++;
        continue;
      }

      const targetUrl = buildVerifyUrl(
        publicBaseUrl,
        credential.storageUri,
        credential.digestMultibase,
        credential.decryptionKey,
      );

      const links: Link[] = [
        {
          href: targetUrl,
          rel: entry.linkType,
          type: entry.mimeType ?? 'application/json',
          title: entry.title,
        },
      ];

      const registration = await idrService.publishLinks(
        entry.schemePrimaryKey,
        entry.identifierValue,
        links,
        entry.qualifierPath,
        { namespace: entry.namespace, description: entry.title },
      );

      const auditRecords = registration.links.map((l) => ({
        tenantId,
        identifierId: identifier.id,
        idrLinkId: entry.key,
        linkType: l.link.rel,
        targetUrl: l.link.href,
        mimeType: l.link.type ?? 'application/json',
        resolverUri: registration.resolverUri,
        qualifierPath: entry.qualifierPath,
      }));

      await createManyLinkRegistrations(auditRecords);
      published++;
      logger.info({ key: entry.key, targetUrl, resolverUri: registration.resolverUri }, 'BCMine IDR link published');
    } catch (error) {
      failed++;
      logger.warn(
        { key: entry.key, error: error instanceof Error ? error.message : error },
        'BCMine link seed entry failed',
      );
    }
  }

  logger.info({ tenantId, published, skipped, failed, total: manifest.links.length }, 'BCMine link seed complete');
}
