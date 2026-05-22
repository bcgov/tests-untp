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
  productName?: string;
  facilityName?: string;
  isPublished?: boolean;
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
  issuerDid?: string;
};

type EntityBinding = {
  productId?: string;
  facilityId?: string;
  productRegisteredId?: string;
  productBatchNumber?: string;
  facilityRegisteredId?: string;
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
  let current: unknown = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const nextPart = parts[i + 1];
    const nextIsIndex = /^\d+$/.test(nextPart);

    if (Array.isArray(current)) {
      const index = Number(key);
      if (current[index] === undefined || typeof current[index] !== 'object' || current[index] === null) {
        current[index] = nextIsIndex ? [] : {};
      }
      current = current[index];
      continue;
    }

    if (typeof current !== 'object' || current === null) {
      return;
    }
    const record = current as Record<string, unknown>;
    if (
      !(key in record) ||
      typeof record[key] !== 'object' ||
      record[key] === null ||
      (nextIsIndex && !Array.isArray(record[key]))
    ) {
      record[key] = nextIsIndex ? [] : {};
    }
    current = record[key];
  }

  const last = parts[parts.length - 1];
  if (Array.isArray(current)) {
    current[Number(last)] = value;
  } else if (typeof current === 'object' && current !== null) {
    (current as Record<string, unknown>)[last] = value;
  }
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
  const subject = Array.isArray(credentialSubject)
    ? (credentialSubject as CredentialPayload['credentialSubject'])
    : (credentialSubject as CredentialPayload['credentialSubject']);
  return {
    '@context': context as CredentialPayload['@context'],
    type: type as CredentialPayload['type'],
    issuer: issuer as CredentialPayload['issuer'],
    credentialSubject: subject,
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

async function resolveEntityBinding(
  prisma: PrismaClient,
  tenantId: string,
  entry: BcmineCredentialManifestEntry,
): Promise<EntityBinding> {
  const binding: EntityBinding = {};

  if (entry.productName) {
    const product = await prisma.product.findFirst({
      where: { tenantId, name: entry.productName },
      include: { primaryIdentifier: true },
    });
    if (product) {
      binding.productId = product.id;
      binding.productRegisteredId = product.primaryIdentifier?.value;
      binding.productBatchNumber = product.batchNumber ?? undefined;
    }
  }

  if (entry.facilityName) {
    const facility = await prisma.facility.findFirst({
      where: { tenantId, name: entry.facilityName },
      include: { primaryIdentifier: true },
    });
    if (facility) {
      binding.facilityId = facility.id;
      binding.facilityRegisteredId = facility.primaryIdentifier?.value;
    }
  }

  return binding;
}

function applyEntityOverrides(
  entry: BcmineCredentialManifestEntry,
  raw: Record<string, unknown>,
  binding: EntityBinding,
): void {
  const extra: Record<string, string> = { ...entry.overrides };

  if (binding.productRegisteredId) {
    if (entry.credentialType === 'DigitalProductPassport') {
      extra['credentialSubject.product.registeredId'] = binding.productRegisteredId;
      if (binding.productBatchNumber) {
        extra['credentialSubject.product.batchNumber'] = binding.productBatchNumber;
      }
    }
    if (entry.credentialType === 'DigitalTraceabilityEvent') {
      extra['credentialSubject.0.outputEPCList.0.registeredId'] = binding.productRegisteredId;
    }
  }

  if (binding.facilityRegisteredId && entry.credentialType === 'DigitalFacilityRecord') {
    extra['credentialSubject.facility.registeredId'] = binding.facilityRegisteredId;
  }

  applyOverrides(raw, extra);
}

/**
 * Issue BCMine credentials from templates; binds product/facility FKs and aligned registeredIds.
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
  let backfilled = 0;
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

      const binding = await resolveEntityBinding(prisma, tenantId, entry);
      const isPublished = entry.isPublished !== false;

      const existing = await prisma.credential.findFirst({
        where: { tenantId, seedKey: entry.key },
      });
      if (existing) {
        await prisma.credential.update({
          where: { id: existing.id },
          data: {
            productId: binding.productId,
            facilityId: binding.facilityId,
            isPublished,
          },
        });
        skipped++;
        backfilled++;
        continue;
      }

      const raw = loadTemplatePayload(entry);
      raw.id = `urn:bcmine:seed:${entry.key}`;
      applyEntityOverrides(entry, raw, binding);
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
          seedKey: entry.key,
          storageUri: storageRecord.uri,
          digestMultibase: storageRecord.digestMultibase,
          decryptionKey: storageRecord.decryptionKey,
          credentialType: entry.credentialType,
          isPublished,
          organisationId: organisation.id,
          productId: binding.productId,
          facilityId: binding.facilityId,
        },
      });
      issued++;

      logger.info(
        {
          key: entry.key,
          credentialType: entry.credentialType,
          productId: binding.productId,
          facilityId: binding.facilityId,
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
    { tenantId, issued, skipped, backfilled, failed, total: manifest.credentials.length },
    'BCMine credential seed complete',
  );
}
