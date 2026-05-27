# Deploy overlays

Helm values for [`charts/tests-untp-ri`](../charts/tests-untp-ri) — minimum viable Reference Implementation stack.

## Install

```bash
# Build and push the RI image first (from repo root):
# docker build -f packages/reference-implementation/Dockerfile -t ghcr.io/bcgov/tests-untp-reference-implementation:dev .

helm upgrade --install tests-untp-ri ./charts/tests-untp-ri \
  -f deploy/dev/values.yaml \
  -n <namespace>
```

Use release name **`tests-untp-ri`** (matches `fullnameOverride`).

## Components

| Workload | Purpose |
|----------|---------|
| `*-ri` | Reference Implementation (Next.js API) |
| `*-keycloak` | OIDC / tenant auth |
| `*-ri-db` | RI PostgreSQL |
| `*-vckit` | Verifiable credential service |
| `*-vckit-db` | VCKit PostgreSQL |
| `*-storage` | UNCEFACT storage service |
| `*-idr` | Identity resolver |
| `*-minio` | IDR object storage |

## Prerequisites

- OpenShift Routes for RI and Keycloak (`route.ri.host`, `route.keycloak.host`)
- RI container image published to `ri.image.repository:tag`
- Storage class for PVCs (or set `*.persistence.storageClass` in values)
- Namespace quota for ~5 PVCs + workloads

## Keycloak client

The bundled realm import (`ri-local`) expects client `ri-app` with secret matching `oidc-client-secret` in the chart Secret (default `changeme` on first install). Align Keycloak client secret after install if login fails.

## Production

Set `ri.verifyAllowPrivateUrls: false` and use strong secrets (`secrets.create` + rotate, or `secrets.existingSecret`).
