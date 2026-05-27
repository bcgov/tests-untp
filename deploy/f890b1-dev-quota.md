# Shared namespace quota: `f890b1-dev`

**Publisher** (`untp-publisher-service`) and **Reference Implementation** (`tests-untp-ri`) run in the same namespace. Plan installs against these OpenShift quotas:

| Quota | Hard | Publisher (target) | RI (target) | Combined |
|-------|------|--------------------|-------------|----------|
| `netapp-file-standard` storage | **1Gi** | **512Mi** (mongo PVC) | **512Mi** (ri-db + vckit-db) | **1Gi** |
| Long-running memory **requests** | **2Gi** | **256Mi** (2 pods) | **~768Mi** (8 pods) | **~1Gi** |
| Long-running CPU **requests** | **500m** | **50m** | **~85m** | **~135m** |

Limits (burstable) can be higher; only **requests** and **PVC size** count toward quota.

## Publisher (`untp-publisher-service`)

```bash
helm upgrade --install untp-publisher-service ./charts/untp-publisher \
  -f deploy/dev/values.yaml -n f890b1-dev
```

- 1× MongoDB PVC: **512Mi** (`netapp-file-standard`) — already deployed; size cannot be reduced in place.
- Backend + Mongo: low **requests** (see `untp-publisher-service/deploy/dev/values.yaml`).

## Reference Implementation (`tests-untp-ri`)

```bash
helm upgrade --install tests-untp-ri ./charts/tests-untp-ri \
  -f deploy/dev/values.yaml -n f890b1-dev
```

- 2× Postgres PVC: **256Mi** each (uses remaining **512Mi** storage).
- Storage service + MinIO: **emptyDir** (no PVC) to stay within 1Gi.
- Eight workloads; low CPU/memory **requests**.

## Check before / after

```bash
kubectl describe resourcequota -n f890b1-dev
kubectl get pvc -n f890b1-dev
```

If install fails on storage, only options are: shrink publisher Mongo (delete PVC + reinstall smaller), move one stack to another namespace, or request quota increase.
