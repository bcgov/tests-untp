# Deploy overlays

Environment-specific Helm values for [`charts/tests-untp-ri`](../charts/tests-untp-ri). Merge an overlay with chart defaults:

```bash
helm upgrade --install tests-untp-ri ./charts/tests-untp-ri \
  -f deploy/dev/values.yaml \
  -n <namespace>
```

Use release name **`tests-untp-ri`** (matches `fullnameOverride`).

## Layout

| Path | Environment |
|------|-------------|
| `deploy/dev/values.yaml` | Development (BC Gov OpenShift Gold) |

## Images

Only the **Reference Implementation** image is built from this repo. Dev overlay uses the image UN/CEFACT publishes from `next`:

```bash
docker pull ghcr.io/uncefact/tests-untp/reference-implementation:next
```

All other workloads use public images defined in the chart (`project-vckit`, `project-storage-service`, `pyx-identity-resolver`, Keycloak, Postgres, MinIO).

To use a **bcgov-built** RI image instead, override in values:

```yaml
ri:
  image:
    repository: ghcr.io/bcgov/tests-untp/reference-implementation
    tag: dev
```

Build from repo root:

```bash
docker build -f packages/reference-implementation/Dockerfile --target build \
  -t ghcr.io/bcgov/tests-untp/reference-implementation:dev .
```

## Prerequisites

- OpenShift Routes: `route.ri.host` and `route.keycloak.host` in `deploy/dev/values.yaml`
- Namespace quota for five PVCs plus eight workloads
- Keycloak realm client `ri-app` secret must match chart Secret key `oidc-client-secret` (default `changeme` on first install)

## Components (MVP)

| Workload | Purpose |
|----------|---------|
| `*-ri` | Reference Implementation API/UI |
| `*-keycloak` | OIDC authentication |
| `*-ri-db` | RI PostgreSQL |
| `*-vckit` / `*-vckit-db` | Verifiable credential service |
| `*-storage` | Credential/template storage |
| `*-idr` / `*-minio` | Identity resolver + object store |
