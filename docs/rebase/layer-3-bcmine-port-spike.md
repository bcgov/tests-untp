# Layer 3 spike: porting BCMine (pyx) onto `next`

**Date:** 2026-05-21  
**Branches:** `origin/next` (target) · `origin/pyx/MSPYX-826_bcmine_v0.6.0` (source)  
**Prerequisite:** Layers 1–2 on `rebase-attempt-1` (assets + ToastMessage)

---

## Executive summary

**BCMine on pyx is not a “rebase” problem.** It is a **product-model migration**:

| pyx (`app-config.json`) | `next` (reference implementation) |
|---------------------------|-----------------------------------|
| 6 **apps** with **features** → JsonForm + **services** pipelines | **No** app-config UI ([#458](https://github.com/bcgov/tests-untp/pull/458)) |
| Monolithic JSON (~6.8k lines × 3 copies) | **Postgres + Prisma** + REST APIs |
| localhost VCKit / IDR URLs in JSON | **ServiceInstance** (encrypted config) + env at seed |
| `packages/mock-app` | `packages/reference-implementation` |

**What you can port now** with existing machinery: **branding assets**, **custom render templates** (optional), **registrar/scheme** extensions via **`custom seed`**, and **credential/org/product data** via **API or new seed scripts**.

**What you cannot port** without new RI features: multi-actor **“Copper Mine → Smelter → Battery”** click-through issuance UX (the old `apps[].features[]` model).

---

## How `next` seeds “demo” data today

### 1. Built-in Prisma seed (`packages/reference-implementation/prisma/seed.ts`)

Runs on `pnpm prisma db seed` / Docker startup.

| Step | What gets created | Env / deps |
|------|-------------------|------------|
| System tenant | `SYSTEM_TENANT_ID` | always |
| Service instances | IDR (Pyx), Storage (UNCEFACT), VC (VCKit) | `SERVICE_ENCRYPTION_KEY`, adapter URLs/keys |
| Default DID | `did:web` / `did:web+vh` | `getDidConfig()` |
| Core **DataModel** rows | DPP, DCC, DFR, DIA, DTE @ v0.6.0, v0.6.1, v0.7.0 | static CUIDs in seed |
| **RenderTemplate** rows | `.hbs` from `src/templates/v{version}/{type}/template.hbs` uploaded to storage | storage service must seed first |
| **Custom seed** | Optional YAML manifest | `/app/seed/custom/seed.yaml` |

Tenant auth config (`TENANT_MODE`, group claims) is **env-only** — see `src/lib/auth/tenant-config.ts`. It is **not** the old `app-config` branding.

### 2. Custom seed (`examples/seed/` → `/app/seed/custom/`)

**Schema:** `prisma/custom-seed-schema.ts`

Supported entities only:

- `registrars` (+ nested `identifierSchemes`, `qualifiers`)
- `dataModels` (extensions with `parentConfigId`)
- `renderTemplates` (`.hbs` file paths + `dataModelId`)

**Example:** `examples/seed/seed.yaml` (AATP livestock passport).

**Mount in Docker:**

```yaml
volumes:
  - ./examples/seed:/app/seed/custom:ro
```

**Skip:** `SKIP_CUSTOM_SEED=true`

### 3. What is *not* in seed today

These exist as **Prisma models + REST APIs** but have **no** YAML/custom-seed or demo bulk loader:

- `OrganisationEntity`, `Facility`, `Product`
- `Credential` (metadata for stored VCs)
- `LinkRegistration` (IDR published links)
- Per-tenant **primaryColor / logo** on `Tenant` (fields exist; not loaded from pyx JSON)

The protected UI is minimal: **dashboard**, **configuration/dids**, **verify** — not actor-specific issuance wizards.

---

## What pyx `app-config.json` contains

**Top-level keys:** `name`, `styles`, `generalFeatures`, `apps`, `identifyProvider`, `identifierSchemes`, `defaultVerificationServiceLink`

**Apps (6):**

| App | Features (count) | Role |
|-----|------------------|------|
| Copper Mine | 4 | Producer / transformation events |
| Copper Smelter | 4 | Processing |
| Battery Manufacturer | 2 | Downstream |
| CopperMark | 2 | Certification body |
| OrgBook | 2 | Identity / registry |
| TSM | 1 | Certification |

Each **feature** bundles:

- `components[]` — `JsonForm`, `CustomButton`, `QRCodeScannerDialogButton`, etc.
- `services[]` — `processTransformationEventOnly`, VCKit issue, IDR link, etc.
- Embedded **sample JSON** for events and credentials
- `renderTemplate` references inline

**Also on pyx branch:** `app-config-v0.5.0.json`, duplicated configs under `packages/mock-app` and `packages/components`.

**Templates:** pyx kept older layouts under `packages/mock-app/src/templates/` (v0.5.0 flat + v0.6.0 dirs). `next` already ships UNTP templates under `packages/reference-implementation/src/templates/` — BCMine **DPP template** body is ~same size as core RI template; **demo difference is mostly data** (`productImage`, links, pre-baked VCs in JSON).

---

## Mapping table: pyx → `next`

| pyx `app-config` concept | `next` target | Port mechanism | Effort |
|--------------------------|---------------|----------------|--------|
| `styles` / app branding | `Tenant.primaryColor`, `logo` | Migration script or admin API | S |
| `apps[].assets.logo` | `Tenant.logo` or public `/bcmine/*` | URL in tenant + static files (Layer 1 done) | S |
| `identifierSchemes` | `IdentifierScheme` + `Registrar` | `custom seed` YAML | M |
| `identifyProvider` / IDR URLs | `ServiceInstance` (IDR) | env + seed (already Pyx IDR) | S |
| VCKit `issuer` in services | `ServiceInstance` (VC) + `Did` | env + DID seed | S |
| `renderTemplate` in features | `RenderTemplate` + storage URI | `custom seed` + `.hbs` files | M |
| Core UNTP types (DPP, DTE, …) | `DataModel` | **Already in** `seed.ts` | — |
| Embedded credential JSON | `Credential` + storage blobs | **New** import script / API batch | L |
| EPCIS / event samples in JsonForm | No equivalent UI | API + future UI or external tool | XL |
| `apps[]` navigation & workflows | — | **Not in RI** post-#458 | **Blocked** |
| `generalFeatures` (conformity) | — | **Not in RI** | **Blocked** |

---

## Recommended port plan (phased)

### Phase 3a — Custom seed package (fits existing hooks)

Create `examples/seed/bcmine/`:

1. `seed.yaml` — BCMine-specific **render template** overrides (if templates differ from core) and any **registrar/scheme** tweaks for GS1 demo IDs used in copper chain.
2. `render-templates/*.hbs` — only files that **diff** from `src/templates/…` on `next`.
3. Document required **parent** `dataModelId` CUIDs from `seed.ts` (e.g. DPP v0.6.1 → `c1pxfzzkeb86jgeel7hrvmcle`).

**Proof-of-one:** one `renderTemplates` entry + one `.hbs` for BCMine-styled DPP using `/bcmine/mine01.png` in example data.

### Phase 3b — Data import script (new tooling)

**Status on `rebase-attempt-1`:** implemented.

| Piece | File | Notes |
|-------|------|--------|
| Organisations | `examples/seed/bcmine/actors.json` → `seed-bcmine.ts` | Six actors + tenant colours |
| Credentials | `examples/seed/bcmine/credentials.json` → `seed-bcmine-credentials.ts` | Three VCs (DPP/DFR/DCC @ v0.6.0 templates + overrides); sign + store when VC/storage seeded |

Still manual / future: facilities, products with IDR identifiers, `LinkRegistration` rows, full pyx credential graph.

**Proof-of-one:** organisation rows + verify page with seeded `storageUri` + `digestMultibase` (DPP for Copper Mine).

### Phase 3c — Interactive demo (product decision)

| Option | Pros | Cons |
|--------|------|------|
| **A. Keep pyx branch** for BCMine roadshows | Full UX today | Diverges from `next`; no utils/v0.7 |
| **B. Rebuild workflows in RI** | Single codebase | Large UX + services effort |
| **C. Hybrid** | RI verify + renders; pyx for issuance only | Two deployments |

---

## Merge attempt 1 lessons (why split matters)

```
modify/delete  → pyx edits files removed on next (app-config, mock-app components)
file location  → public assets path rename (fixed in Layer 1)
content        → ToastMessage (fixed in Layer 2)
```

Layer 3 **must not** `git merge` pyx. Use **extract → map → seed/API**.

---

## Implementation status (on `rebase-attempt-1`)

| Phase | Status |
|-------|--------|
| **3a** | `examples/seed/bcmine/seed.yaml` + `render-templates/dpp-bcmine.hbs` |
| **3b** | `actors.json` + `prisma/seed-bcmine.ts` (hooked from `seed.ts`) |
| **3c** | Not implemented — interactive app-config UI still requires pyx branch or new RI work |

**Do not** add root `app-config.json` to the branch.

---

## Commands

```bash
# Explore pyx apps
git show origin/pyx/MSPYX-826_bcmine_v0.6.0:app-config.json | jq '.apps[].name'

# Core data model IDs on next
rg "credentialType: 'DigitalProductPassport'" packages/reference-implementation/prisma/seed.ts

# Run RI seed locally
cd packages/reference-implementation && pnpm prisma migrate dev && pnpm prisma db seed
```

---

## References

- [pyx-onto-next-plan.md](./pyx-onto-next-plan.md) — layers 1–2
- `examples/seed/seed.yaml` — custom seed reference
- `packages/reference-implementation/prisma/seed.ts` — system seed
- PR #458 — removal of app-config-driven construction
