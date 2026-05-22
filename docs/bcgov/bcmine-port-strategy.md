# BCMine port strategy (bcgov fork)

**Goal:** Carry pyx BCMine reference demo on top of uncefact `next` with **zero merge conflicts** when pulling upstream. We do **not** contribute back; we **do** rebase/merge `upstream/next` regularly.

## Conflict-free rules

| Do | Don't |
|----|--------|
| Add files under `examples/seed/bcmine/`, `public/bcmine/`, `prisma/seed-bcmine*.ts`, `docs/bcgov/` | Merge or rebase `pyx/MSPYX-826_bcmine_v0.6.0` wholesale |
| Touch shared files minimally (`seed.ts` hooks, `ToastMessage` only where `next` still has the file) | Revive deleted paths (`app-config.json`, `mock-app/`, `BarcodeGenerator`, …) |
| Keep BCMine in **small, ordered commits** on one integration branch | Edit upstream-owned templates unless BCMine-specific copy lives in custom seed |

## Remotes and branches

```bash
git remote add upstream https://github.com/uncefact/tests-untp.git   # once
git fetch upstream
git checkout next && git merge upstream/next    # mirror upstream
git checkout bcmine-next && git rebase next     # replay port commits
```

| Branch | Purpose |
|--------|---------|
| **`upstream/next`** | Track uncefact (read-only) |
| **`origin/bcmine-next`** | BCMine port integration |
| **`pyx/…`** | Archive / roadshow issuance only |

## Port layers (status)

| Layer | Status |
|-------|--------|
| 1 Assets | Done |
| 2 ToastMessage VC link | Done |
| 3a Custom seed (GS1, ABR, NLIS, DPP `.hbs`) | Done |
| 3b Organisations + logos/colours + ABN identifiers | Done |
| 3c Entities (facilities, products, facility links) | Done |
| 3d Credentials (15 VCs, `seedKey`, entity FKs, `isPublished`) | Done |
| 3e IDR links (15 verify URLs) | Done |
| 3h Barcode UX | Partial — verify QR scan only |
| 4 Interactive issuance UI | **Blocked** — pyx `apps[]` / JsonForm ([#458](https://github.com/bcgov/tests-untp/pull/458)) |

## Remaining (optional / operational)

| Item | Notes |
|------|--------|
| **Docker smoke test** | `migrate deploy` + seed with VC/storage/IDR env |
| **Merge `bcmine-next` → bcgov `next`** | Deploy integration |
| **GTIN barcode generation** | Pyx `BarcodeGenerator` — needs UI + `react-barcode` |
| **GS1 barcode → resolve page** | Use `identifier-carriers.json` in a lookup UI |
| **Extra render templates** | DCC/DFR/DTE/DIA BCMine styling (optional) |
| **RI issuance wizards** | Product decision — large effort |

## What we do not port

- Root `app-config.json` and mock-app issuance pipelines
- `BarcodeGenerator`, `ConformityCredential`, `QRCodeScannerDialogButton`, `Scanning`, `GenericFeature`

Roadshow click-through issuance: keep **`pyx/MSPYX-826_bcmine_v0.6.0`**.

## Seed order (BCMine block)

1. `seed.yaml` (registrars + render template)
2. `actors.json` (orgs + branding + ABN)
3. `entities.json` (facilities + products)
4. `credentials.json` (sign + store + FKs)
5. IDR scheme registration (main seed)
6. `links.json` (Pyx IDR publish)

## Environment

- `BCMINE_SEED_DIR`, `SKIP_BCMINE_SEED`
- `SERVICE_ENCRYPTION_KEY`, `SYSTEM_VC_*`, `SYSTEM_STORAGE_*`, `SYSTEM_IDR_*`
- `RI_PUBLIC_BASE_URL` or `RI_APP_URL` (IDR link targets, default `http://localhost:3003`)
