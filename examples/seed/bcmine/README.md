# BCMine custom seed (pyx → `next`)

Ports the **BC Copper** demo from `pyx/MSPYX-826_bcmine_v0.6.0` onto `next` on branch **`bcmine-next`**.

| Layer | Files | Loaded by |
|-------|--------|-----------|
| **3a** | `seed.yaml`, `render-templates/dpp-bcmine.hbs` | [custom-seed.ts](../../packages/reference-implementation/prisma/custom-seed.ts) |
| **3b** | `actors.json` | [seed-bcmine.ts](../../packages/reference-implementation/prisma/seed-bcmine.ts) |
| **3c** | `entities.json` | [seed-bcmine-entities.ts](../../packages/reference-implementation/prisma/seed-bcmine-entities.ts) |
| **3d** | `credentials.json` | [seed-bcmine-credentials.ts](../../packages/reference-implementation/prisma/seed-bcmine-credentials.ts) |
| **3e** | `links.json` | [seed-bcmine-links.ts](../../packages/reference-implementation/prisma/seed-bcmine-links.ts) (after Pyx IDR scheme registration) |

Static images: `packages/reference-implementation/public/bcmine/` → `/bcmine/<file>.png`

## Docker

```yaml
volumes:
  - ./examples/seed/bcmine:/app/seed/custom:ro
```

```bash
cd packages/reference-implementation
pnpm prisma migrate deploy
pnpm prisma db seed
```

## What gets created

### `seed.yaml`

- **GS1** (GTIN `01`, GLN `gln`), **ABR** (ABN), **NLIS** registrars
- **BC Copper DPP** render template (v0.6.1, non-default)

### `actors.json`

- Tenant chain colours
- Six organisations with **`logo`** and **`primaryColor`** on `OrganisationEntity` (re-applied on re-seed)

### `entities.json`

- 3 facilities (mine, smelter, battery plant) with GS1 GLNs
- 3 products linked to facilities (`manufacturingFacilityId`)

### `credentials.json` (15 VCs)

Maps pyx issuance features to seeded credentials (idempotent via `Credential.seedKey`):

| seedKey | Type | Issuer org |
|---------|------|------------|
| `bcmine-mine-dte` | DTE | Copper Mine |
| `bcmine-mine-dpp` | DPP | Copper Mine |
| `bcmine-mine-dfr` | DFR | Copper Mine |
| `bcmine-mine-move-dte` | DTE | Copper Mine |
| `bcmine-smelter-transform-dte` | DTE | Copper Smelter |
| `bcmine-smelter-dpp` | DPP | Copper Smelter |
| `bcmine-smelter-dfr` | DFR | Copper Smelter |
| `bcmine-smelter-move-dte` | DTE | Copper Smelter |
| `bcmine-battery-transform-dte` | DTE | Battery Manufacturer |
| `bcmine-battery-dpp` | DPP | Battery Manufacturer |
| `bcmine-coppermark-mine-dcc` | DCC | CopperMark |
| `bcmine-coppermark-smelter-dcc` | DCC | CopperMark |
| `bcmine-orgbook-mine-dcc` | DCC | OrgBook |
| `bcmine-orgbook-mine-dia` | DIA | OrgBook |
| `bcmine-tsm-mine-dcc` | DCC | TSM |

Requires VC + storage env (same as main seed).

### `links.json`

Publishes Pyx IDR links for GTIN/GLN identifiers → RI **`/verify?uri=…&digestMultibase=…`** URLs.

### `identifier-carriers.json`

Documents pyx barcode/manual-entry scheme hints (GTIN, NLIS, ABN) for future UI — not executed by seed.

### Barcode / QR UX

- **Verify page** (`/verify`): “Scan credential QR” using [Scanner](../../packages/reference-implementation/src/components/Scanner) + [VerifyQrScanner](../../packages/reference-implementation/src/components/VerifyQrScanner)
- Pyx **BarcodeGenerator** (GTIN element strings) is **not** ported — would need `react-barcode` + issuance UI

## Environment

| Variable | Effect |
|----------|--------|
| `SKIP_BCMINE_SEED` | Skip all BCMine seed modules |
| `BCMINE_SEED_DIR` | Directory with `actors.json` |
| `RI_PUBLIC_BASE_URL` | Base URL for IDR link targets (default `http://localhost:3003`) |
| `SERVICE_ENCRYPTION_KEY`, `SYSTEM_VC_*`, `SYSTEM_STORAGE_*`, `SYSTEM_IDR_*` | Required for credentials + links |

## Not included

- pyx **`app-config.json`** interactive JsonForm issuance ([#458](https://github.com/bcgov/tests-untp/pull/458))
- Full pyx **BarcodeGenerator** in issuance flows

See [docs/bcgov/bcmine-port-strategy.md](../../docs/bcgov/bcmine-port-strategy.md).
