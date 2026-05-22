# BCMine custom seed (pyx → `next`)

Ports the **BC Copper** demo from `pyx/MSPYX-826_bcmine_v0.6.0` onto `next` in two layers:

| Layer | Files | Loaded by |
|-------|--------|-----------|
| **3a** | `seed.yaml`, `render-templates/dpp-bcmine.hbs` | [custom seed](../../packages/reference-implementation/prisma/custom-seed.ts) |
| **3b** | `actors.json` | [seed-bcmine.ts](../../packages/reference-implementation/prisma/seed-bcmine.ts) via main `seed.ts` |

Static images live in `packages/reference-implementation/public/bcmine/` (branch `rebase-attempt-1`, Layer 1).

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

- **Render template** `BC Copper DPP (BCMine)` for core DPP v0.6.1 (`dataModelId: c1pxfzzkeb86jgeel7hrvmcle`)
- Template file is the pyx BCMine DPP `.hbs` (non-default; core UNTP template remains default)

### Data seed (`actors.json`)

- System **tenant** colours from pyx chain `styles`
- Six **OrganisationEntity** rows: Copper Mine, Copper Smelter, Battery Manufacturer, CopperMark, OrgBook, TSM
- Idempotent by organisation `name`

## Environment

| Variable | Default | Effect |
|----------|---------|--------|
| `SKIP_CUSTOM_SEED` | unset | When `true`, skips YAML custom seed only |
| `SKIP_BCMINE_SEED` | unset | When `true`, skips `actors.json` organisation seed |
| `BCMINE_SEED_DIR` | auto | Override directory containing `actors.json` |

## Not included (see spike doc)

- Old `app-config.json` **apps / features / JsonForm** issuance flows — removed on `next` ([#458](https://github.com/bcgov/tests-untp/pull/458))
- Pre-issued credential payloads and IDR links — future import script / API batch

Full analysis: [docs/rebase/layer-3-bcmine-port-spike.md](../../docs/rebase/layer-3-bcmine-port-spike.md)

## Local dev without Docker

From repo root, after main seed prerequisites (`SERVICE_ENCRYPTION_KEY`, Postgres, etc.):

```bash
BCMINE_SEED_DIR="$(pwd)/examples/seed/bcmine" pnpm --filter untp-reference-implementation exec prisma db seed
```

Custom seed also runs when `examples/seed/bcmine/seed.yaml` is found via the same mount path logic.
