# BCMine port strategy (bcgov fork)

**Goal:** Carry pyx BCMine reference demo on top of uncefact `next` with **zero merge conflicts** when pulling upstream. We do **not** contribute back; we **do** rebase/merge `upstream/next` regularly.

## Conflict-free rules

| Do | Don't |
|----|--------|
| Add files under `examples/seed/bcmine/`, `public/bcmine/`, `prisma/seed-bcmine*.ts`, `docs/bcgov/` | Merge or rebase `pyx/MSPYX-826_bcmine_v0.6.0` wholesale |
| Touch shared files minimally (`seed.ts` hooks, `ToastMessage` only where `next` still has the file) | Revive deleted paths (`app-config.json`, `mock-app/`, `BarcodeGenerator`, …) |
| Keep BCMine in **small, ordered commits** on one integration branch | Edit upstream-owned templates unless BCMine-specific copy lives in custom seed |

A clean port branch should show **only additive paths + tiny hooks** in `git diff upstream/next...HEAD`.

## Remotes and branches

```bash
git remote add upstream https://github.com/uncefact/tests-untp.git   # once
git fetch upstream
```

| Branch | Purpose |
|--------|---------|
| **`upstream/next`** | Track uncefact (read-only) |
| **`origin/next`** | bcgov mirror of upstream + optional fast-forward |
| **`origin/bcmine-next`** (or `rebase-attempt-1`) | **BCMine port integration** — merge target for port PRs |
| **`pyx/…`** | Archive only — do not merge into bcmine-next |

### Pull upstream updates

```bash
git fetch upstream
git checkout next
git merge upstream/next          # update bcgov mirror
git checkout bcmine-next
git rebase next                  # replay BCMine commits; fix conflicts only in bcmine/seed hooks
git push origin bcmine-next
```

## Port layers (status)

| Layer | Status | Notes |
|-------|--------|--------|
| 1 Assets | Done | `public/bcmine/` |
| 2 ToastMessage | Done | Optional VC link |
| 3a Custom seed | Done | `seed.yaml` + DPP `.hbs` + **GS1 registrars** |
| 3b Organisations | Done | `actors.json` |
| 3c Entities | In progress | `entities.json` — facilities + products |
| 3d Credentials | Partial | DPP, DFR, DCC; add DTE, DIA |
| 3e IDR links | Todo | `LinkRegistration` after schemes exist |
| 4 Interactive UI | Blocked on RI | pyx `apps[]` / JsonForm — not on `next` ([#458](https://github.com/bcgov/tests-untp/pull/458)) |

## What pyx provides that we are **not** porting

- Root `app-config.json` and mock-app issuance pipelines
- `BarcodeGenerator`, `ConformityCredential`, `QRCodeScannerDialogButton`, `Scanning`, `GenericFeature`
- `yarn.lock` / mock-app package layout

Roadshow UX stays on **`pyx/MSPYX-826_bcmine_v0.6.0`** until RI grows equivalent workflows.

## Proof of a conflict-free branch

```bash
git fetch upstream
git merge-tree $(git merge-base HEAD upstream/next) HEAD upstream/next | grep -c conflict || echo "clean vs upstream/next"
git merge origin/pyx/MSPYX-826_bcmine_v0.6.0 --no-commit  # expect failure — do not commit
```

See also [pyx-onto-next-plan.md](../rebase/pyx-onto-next-plan.md), [layer-3-bcmine-port-spike.md](../rebase/layer-3-bcmine-port-spike.md).
