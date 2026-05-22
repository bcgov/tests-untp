# BCMine custom seed (planned)

Port target for **Layer 3a** of the pyx → `next` integration ([spike doc](../../docs/rebase/layer-3-bcmine-port-spike.md)).

## Purpose

Use the **custom seed** hook (`/app/seed/custom/seed.yaml`) to add BCMine-specific:

- Render template overrides (BC branding, `/bcmine/*` images from Layer 1)
- Optional registrar / identifier scheme tweaks for the copper supply-chain demo

This does **not** replace the old `app-config.json` multi-app UI (removed on `next` in [#458](https://github.com/bcgov/tests-untp/pull/458)).

## Mount (local Docker)

```yaml
# docker-compose override
volumes:
  - ./examples/seed/bcmine:/app/seed/custom:ro
```

## Parent data models (from built-in seed)

When adding `dataModels` extensions or `renderTemplates`, reference existing core IDs from `packages/reference-implementation/prisma/seed.ts`, for example:

| Credential | Version | `dataModelId` (core) |
|------------|---------|----------------------|
| Digital Product Passport | 0.6.1 | `c1pxfzzkeb86jgeel7hrvmcle` |
| Digital Traceability Event | 0.6.1 | `cwb7m3k0hpz9xqft6rjn2oe4s` |
| Digital Facility Record | 0.6.1 | `csrtste8ai2llop7ui8u6n11l` |
| Digital Identity Anchor | 0.6.1 | `cn5u63huxvqgdwppebaxmqt9l` |
| Digital Conformity Credential | 0.6.1 | `cttpz40pfgcfeue2wmbc3jti8` |

Generate new CUIDs for BCMine-owned extension rows and templates (`npx @paralleldrive/cuid2` or project convention).

## Status

- `seed.yaml` — stub only; implement in a follow-up PR after Phase 3b data-import design.
- Static assets — served from `packages/reference-implementation/public/bcmine/` on branch `rebase-attempt-1`.

## pyx source

Extract credential payloads and actor names from:

```bash
git show origin/pyx/MSPYX-826_bcmine_v0.6.0:app-config.json
```
