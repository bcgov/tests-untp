import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  CredentialPayload,
  ExtractedRefs,
  IStorageService,
  IVerifiableCredentialService,
  LoggerService as Logger,
} from '@uncefact/untp-ri-services';
import { getBridge } from '@uncefact/untp-ri-services';
import type { PrismaClient } from '../src/lib/prisma/generated/index.js';

const prismaDir = path.dirname(fileURLToPath(import.meta.url));
const templatesRoot = path.resolve(prismaDir, '../src/templates');

export type BcmineCredentialManifestEntry = {
  key: string;
  credentialType: string;
  version: string;
  template: string;
  organisationName: string;
  overrides?: Record<string, string>;
};

export type BcmineCredentialsFile = {
  credentials: BcmineCredentialManifestEntry[];
};

export type BcmineCredentialSeedDependencies = {
  prisma: PrismaClient;
  logger: Logger;
  tenantId: string;
  bcmineDir: string;
  vcService: IVerifiableCredentialService;
  storageService: IStorageService;
  /** When set, overwrites template issuer.id so VCKit signing matches the seeded system DID. */
  issuerDid?: string;
};

function loadCredentialsManifest(bcmineDir: string): BcmineCredentialsFile | null {
  const manifestPath = path.join(bcmineDir, 'credentials.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as BcmineCredentialsFile;
}

function setByPath(obj: Record<string, unknown>, dotPath: string, value: string): void {
  const parts = dotPath.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = current[key];
    if (typeof next !== 'object' || next === null || Array.isArray(next)) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = value;
}

function applyOverrides(payload: Record<string, unknown>, overrides?: Record<string, string>): void {
  if (!overrides) return;
  for (const [dotPath, value] of Object.entries(overrides)) {
    setByPath(payload, dotPath, value);
  }
}

function loadTemplatePayload(entry: BcmineCredentialManifestEntry): Record<string, unknown> {
  const templatePath = path.join(templatesRoot, `v${entry.version}`, entry.template, 'example-data.json');
  if (!fs.existsSync(templatePath)) {
    throw new Error(`BCMine credential template not found: ${templatePath}`);
  }
  return JSON.parse(fs.readFileSync(templatePath, 'utf-8')) as Record<string, unknown>;
}

function toCredentialPayload(raw: Record<string, unknown>): CredentialPayload {
  const { credentialSubject, issuer, type, '@context': context, validUntil, renderMethod } = raw;
  if (!credentialSubject || !issuer || !type || !context) {
    throw new Error('Template example-data is missing required VC fields');
  }
  return {
    '@context': context as CredentialPayload['@context'],
    type: type as CredentialPayload['type'],
    issuer: issuer as CredentialPayload['issuer'],
    credentialSubject: credentialSubject as CredentialPayload['credentialSubject'],
    ...(validUntil ? { validUntil: String(validUntil) } : {}),
    ...(renderMethod ? { renderMethod: renderMethod as CredentialPayload['renderMethod'] } : {}),
  };
}

function extractRefs(
  credentialType: string,
  version: string,
  credentialSubject: CredentialPayload['credentialSubject'],
): ExtractedRefs {
  const bridge = getBridge(credentialType, version);
  if (!bridge) {
    return { organisations: [], facilities: [], products: [] };
  }
  const subject = Array.isArray(credentialSubject) ? credentialSubject[0] : credentialSubject;
  return bridge.extractRefs(subject);
}

/**
 * Layer 3b+: issue sample BCMine credentials (DPP, DFR, DCC) from core templates + overrides.
 * Requires VC and storage adapters (same as main seed). Idempotent per organisation + credentialType.
 */
export async function runBcmineCredentialSeed(deps: BcmineCredentialSeedDependencies): Promise<void> {
  const { prisma, logger, tenantId, bcmineDir, vcService, storageService, issuerDid } = deps;
  const manifest = loadCredentialsManifest(bcmineDir);
  if (!manifest?.credentials?.length) {
    logger.info({ bcmineDir }, 'No credentials.json in BCMine seed dir — skipping BCMine credential seed');
    return;
  }

  let issued = 0;
  let skipped = 0;
  let failed = 0;

  for (const entry of manifest.credentials) {
    try {
      const organisation = await prisma.organisationEntity.findFirst({
        where: { tenantId, name: entry.organisationName },
      });
      if (!organisation) {
        logger.warn(
          { organisationName: entry.organisationName, key: entry.key },
          'BCMine credential seed: organisation not found — run actors.json seed first',
        );
        failed++;
        continue;
      }

      const existing = await prisma.credential.findFirst({
        where: {
          tenantId,
          credentialType: entry.credentialType,
          organisationId: organisation.id,
        },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const raw = loadTemplatePayload(entry);
      raw.id = `urn:bcmine:seed:${entry.key}`;
      applyOverrides(raw, entry.overrides);
      if (issuerDid && typeof raw.issuer === 'object' && raw.issuer !== null) {
        (raw.issuer as Record<string, unknown>).id = issuerDid;
      }

      const payload = toCredentialPayload(raw);
      const refs = extractRefs(entry.credentialType, entry.version, payload.credentialSubject);

      logger.info({ key: entry.key, credentialType: entry.credentialType }, 'Signing BCMine seed credential');
      const signed = await vcService.sign(payload);

      logger.info({ key: entry.key }, 'Storing BCMine seed credential');
      const storageRecord = await storageService.store(signed, false);

      if (!storageRecord.digestMultibase) {
        throw new Error(`Storage adapter returned no digestMultibase for ${entry.key}`);
      }

      await prisma.credential.create({
        data: {
          tenantId,
          storageUri: storageRecord.uri,
          digestMultibase: storageRecord.digestMultibase,
          decryptionKey: storageRecord.decryptionKey,
          credentialType: entry.credentialType,
          isPublished: false,
          organisationId: organisation.id,
        },
      });
      issued++;

      logger.info(
        {
          key: entry.key,
          credentialType: entry.credentialType,
          organisationName: entry.organisationName,
          storageUri: storageRecord.uri,
          refs,
        },
        'BCMine seed credential issued',
      );
    } catch (error) {
      failed++;
      logger.warn(
        {
          key: entry.key,
          error: error instanceof Error ? error.message : error,
        },
        'BCMine credential seed entry failed',
      );
    }
  }

  logger.info(
    { tenantId, issued, skipped, failed, total: manifest.credentials.length },
    'BCMine credential seed complete',
  );
}
