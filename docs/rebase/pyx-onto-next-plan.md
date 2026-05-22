# Pyx BCMine branch → `next`: rebase plan (attempt 1)

**Branches**

| Branch | Role |
|--------|------|
| `origin/next` | Current platform (default); 219 commits ahead of merge-base |
| `origin/pyx/MSPYX-826_bcmine_v0.6.0` | BCMine v0.5/0.6 demo; 54 commits since merge-base |
| `rebase-attempt-1` | Planning branch from `next`; documents trial merge |

**Merge-base:** `1df1529` — fix: downgrade chai and node-fetch (#331)

---

## Attempt 1: single merge (`git merge pyx` onto `next`)

**Result:** Failed with structural conflicts — not just line edits.

### Conflict categories

| Category | Count | What happened |
|----------|-------|----------------|
| **modify/delete** | 9 | Pyx changed files that **`next` deleted** (legacy mock-app / root config model) |
| **content** | 3 | `ToastMessage` (*.tsx, test, stories) — both sides changed |
| **file location** | 8 | Images under `packages/mock-app/public/` — **`next` renamed package** to `reference-implementation` |

### Files pyx touches vs `next` layout

| Pyx path | On `next` |
|----------|-----------|
| `app-config.json` (root) | **Removed** — config is tenant/DB-driven ([#458](https://github.com/bcgov/tests-untp/commit/ef98f10)) |
| `packages/mock-app/**` | **`packages/reference-implementation/**`** |
| `packages/components/src/constants/app-config.json` | **Removed** (gitignored example pattern only) |
| `yarn.lock` | **pnpm** workspace (`pnpm-lock.yaml`); root `yarn.lock` gone |
| `BarcodeGenerator`, `ConformityCredential`, `QRCodeScannerDialogButton`, `GenericFeature`, `Scanning` | Removed or relocated with app-config-driven UI |

**Conclusion:** A straight rebase/merge of all 54 commits is the wrong tool. Most pyx value is **BCMine domain config**, which must be **ported** into the v0.7 reference-implementation model, not replayed as JSON file edits.

---

## Recommended split (layers)

Apply onto `rebase-attempt-1` (from `next`) in order. Each layer is its own commit (or PR).

### Layer 1 — Static assets (low risk)

**Source (pyx):** `packages/mock-app/public/*.png`  
**Target (next):** `packages/reference-implementation/public/bcmine/` (URL prefix `/bcmine/`)

| File | Purpose |
|------|---------|
| `bc-logo.png`, `tsm-logo.png`, `coppermark-logo.png` | Branding |
| `mine01–03.png`, `smelter01.png`, `cathode01.png` | Product / site imagery |

- No merge conflicts expected if paths are correct.
- Update any URL references in config to new public paths.

### Layer 2 — Component behaviour (medium risk)

**Goal:** VC link in toast, small scanner/barcode tweaks — **without** dragging app-config.

| File | Pyx change |
|------|------------|
| `ToastMessage.tsx` | Clickable link to issued VC |
| `ToastMessage.test.tsx`, `ToastMessage.stories.tsx` | Tests/stories |
| `BarcodeGenerator.tsx`, `ConformityCredential.tsx`, `QRCodeScannerDialogButton.tsx` | Minor (2–4 lines each) |

**How:** Extract with `git show pyx:path > /tmp` or patch from `f655b3f` **only the component hunks** (that commit also rewrote 4k+ lines of app-config — do not cherry-pick whole commit).

Verify on `next`:

```bash
pnpm build:components
pnpm test:components
```

### Layer 3 — BCMine configuration (high risk / largest effort)

**Source (pyx):** ~6.8k-line `app-config.json` (+ `app-config-v0.5.0.json`), duplicated under mock-app and components.

**On `next`:** Configuration is **tenant DB + Prisma**, not repo-root JSON (`CLAUDE.md`: “replacing legacy app-config.json”).

**Port strategy (pick one):**

1. **Seed/migration** — Script that inserts BCMine apps, credentials, DTEs, links into RI database from pyx JSON.
2. **Export format** — If RI supports import API, map pyx `app-config` → import payload.
3. **Sidecar config** — Only if product agrees to re-introduce file-based config for demos (likely conflicts with #458 direction).

**Domain content to preserve (from pyx commit messages):**

- Supply chain: mine → smelter → battery (MSPYX-379)
- Credential types: DPP, DTE, DFR, DIA, DCC renders (MSPYX-406)
- `did:web` identifier paths (f818fcd)
- Schemas / render templates / storage keys for 0.5.0 → 0.6.0 (11f5f84, ce5ca61)
- DTE mapping for smelter & battery manufacturer
- Local docker-compose / localhost endpoints (dev only)

### Layer 4 — Tooling / lockfile (defer)

- Pyx `yarn.lock` vs `next` **pnpm** — regenerate with `pnpm install` after layers 1–2, not by merging lockfiles.

---

## Pyx commit history (thematic, for cherry-pick reference)

| Range | Theme | Commits |
|-------|--------|---------|
| `12de13e` … `3427dba` | MSPYX-379 BC copper supply chain, DCC/DIA/DPP/DFR | ~30 |
| `d6f0039` … `4796d95` | MSPYX-386 images & Mines Act wording | ~5 |
| `be536b6` … `07de522` | MSPYX-406 render templates | 2 |
| `ad6f46d` … `c8efd59` | DIA removal, BCMine ingest, docker-compose | 4 |
| `a8731e7` … `f818fcd` | DTE/schema/did:web 0.5→0.6 | 6 |
| `f655b3f` | ToastMessage + **large app-config churn** | 1 (split manually) |
| `b437d37`, `1b005bd` | Merge MSPYX-469 | 2 |
| `ce5a7ca` | Final app-config | 1 |

**Do not cherry-pick merges or app-config-only commits wholesale.**

---

## Next steps (attempt 2+)

1. ~~On `rebase-attempt-1`, commit **Layer 1** (images only) → push → PR slice 1.~~ **Done** — assets under `packages/reference-implementation/public/bcmine/` (serve as `/bcmine/<file>.png`).
2. ~~Manually port **Layer 2** (ToastMessage PR) — validate tests.~~ **Done** — optional `linkURL` + “Open VC” link; story `WithVcLink`.
3. ~~Spike **Layer 3**~~ **Done** — see [layer-3-bcmine-port-spike.md](./layer-3-bcmine-port-spike.md) and `examples/seed/bcmine/` stub. BCMine `apps[]` UI cannot port via seed alone; use Phase 3a (custom seed) + 3b (API import) + product decision on interactive demo.
4. Optional: `git rebase origin/next` from a **topic branch** that only contains layers 1–2 (never include root app-config.json).

---

## Commands reference

```bash
# Recreate planning branch
git checkout next && git pull
git checkout -b rebase-attempt-1

# Trial merge (expect failure)
git merge origin/pyx/MSPYX-826_bcmine_v0.6.0 --no-commit
git merge --abort

# Layer 1 example (assets only)
git checkout origin/pyx/MSPYX-826_bcmine_v0.6.0 -- packages/mock-app/public/
mkdir -p packages/reference-implementation/public
git mv packages/mock-app/public/*.png packages/reference-implementation/public/
# rm empty mock-app dirs, commit

# Diff summary
git diff origin/next...origin/pyx/MSPYX-826_bcmine_v0.6.0 --stat
```

---

*Generated from merge attempt 1 on `rebase-attempt-1` (2026-05-20).*
