# BCMine custom seed (pyx → `next`)

Ports the **BC Copper** demo from `pyx/MSPYX-826_bcmine_v0.6.0` onto `next` in two layers:

| Layer | Files | Loaded by |
|-------|--------|-----------|
| **3a** | `seed.yaml`, `render-templates/dpp-bcmine.hbs` | [custom seed](../../packages/reference-implementation/prisma/custom-seed.ts) |
| **3b** | `actors.json` | [seed-bcmine.ts](../../packages/reference-implementation/prisma/seed-bcmine.ts) via main `seed.ts` |
| **3c** | `entities.json` | [seed-bcmine-entities.ts](../../packages/reference-implementation/prisma/seed-bcmine-entities.ts) — facilities + products with GS1 IDs |
| **3d** | `credentials.json` | [seed-bcmine-credentials.ts](../../packages/reference-implementation/prisma/seed-bcmine-credentials.ts) — signs via VCKit, stores via system storage |

Static images live in `packages/reference-implementation/public/bcmine/` (branch `bcmine-next`, Layer 1).

## Docker

Mount this directory as the custom seed root (includes both YAML and JSON):

```yaml
volumes:
  - ./examples/seed/bcmine:/app/seed/custom:ro
```

Then restart / re-run seed:

```bash
cd packages/reference-implementation
pnpm prisma db seed
```

## What gets created

### Custom seed (`seed.yaml`)

- **GS1 registrars** (GTIN `01`, GLN `gln`) — required for `entities.json` identifiers
- **Render template** `BC Copper DPP (BCMine)` for core DPP v0.6.1 (`dataModelId: c1pxfzzkeb86jgeel7hrvmcle`)
- Template file is the pyx BCMine DPP `.hbs` (non-default; core UNTP template remains default)
- When using `BCMINE_SEED_DIR` locally, `seed.yaml` is applied automatically (not only via `/app/seed/custom`)

### Data seed (`actors.json`)

- System **tenant** colours from pyx chain `styles`
- Six **OrganisationEntity** rows: Copper Mine, Copper Smelter, Battery Manufacturer, CopperMark, OrgBook, TSM
- Idempotent by organisation `name`

### Entity seed (`entities.json`)

- **Facilities:** mine site + smelter (GS1 GLN values from pyx demo)
- **Products:** copper concentrate + cathode batch (GS1 GTIN)
- Idempotent by facility/product `name`

### Credential seed (`credentials.json`)

- Four demo VCs from core v0.6.0 `example-data.json` templates with BCMine overrides (DPP, DFR, DCC, DTE)
- Signed with the system VC adapter and stored like production issuance
- `Credential` rows linked to the matching `OrganisationEntity` (idempotent per org + `credentialType`)
- Verify in the RI UI with `uri` + `digestMultibase` from the credential record (or storage URI)
- Skipped when VC/storage were not seeded (same env as main seed)

## Environment

| Variable | Default | Effect |
|----------|---------|--------|
| `SKIP_CUSTOM_SEED` | unset | When `true`, skips YAML custom seed only |
| `SKIP_BCMINE_SEED` | unset | When `true`, skips `actors.json` organisation seed |
| `BCMINE_SEED_DIR` | auto | Override directory containing `actors.json` |

## Not included (see spike doc)

- Old `app-config.json` **apps / features / JsonForm** issuance flows — removed on `next` ([#458](https://github.com/bcgov/tests-untp/pull/458))
- IDR link registration for seeded identifiers — use RI APIs or extend seed later
- Interactive multi-actor issuance UX (pyx `app-config` apps/features)

Fork workflow: [docs/bcgov/bcmine-port-strategy.md](../../docs/bcgov/bcmine-port-strategy.md)  
Full analysis: [docs/rebase/layer-3-bcmine-port-spike.md](../../docs/rebase/layer-3-bcmine-port-spike.md)

## Local dev without Docker

From repo root, after main seed prerequisites (`SERVICE_ENCRYPTION_KEY`, Postgres, etc.):

```bash
BCMINE_SEED_DIR="$(pwd)/examples/seed/bcmine" pnpm --filter untp-reference-implementation exec prisma db seed
```

Custom seed also runs when `examples/seed/bcmine/seed.yaml` is found via the same mount path logic.
