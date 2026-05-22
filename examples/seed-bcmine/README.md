# BC Mine Custom Seed

This directory contains the custom seed configuration for the British Columbia
Copper Supply Chain demo.

## Overview

The BC Mine demo models a copper supply chain with 6 actors:

| Actor | Role | Keycloak User | Credentials Issued |
|-------|------|---------------|-------------------|
| Copper Mine | Producer | mine@example.com | DTE (Transformation), DPP, DFR |
| Copper Smelter | Producer | smelter@example.com | DTE (Transformation), DPP, DFR |
| Battery Manufacturer | Producer | battery@example.com | DTE (Transformation), DPP |
| CopperMark | Certifier | coppermark@example.com | DCC |
| OrgBook | Certifier | orgbook@example.com | DCC, DIA |
| TSM | Certifier | tsm@example.com | DCC |

## Usage

### With Docker Compose

Mount this directory as the custom seed volume:

```yaml
services:
  ri:
    volumes:
      - ./examples/seed-bcmine:/app/seed/custom:ro
```

### Keycloak

The BC Mine actors are pre-configured in `keycloak-realms/ri-local.json`.
Each actor has a dedicated Keycloak user and group. Tenants are auto-provisioned
on first login.

**Credentials**: All users use password `changeme`.

### What Gets Seeded

The `seed.yaml` provisions:
- **GS1 Registrar** with GTIN (product IDs) and GLN (location IDs) schemes
- Qualifier definitions for batch number (AI 10) and serial number (AI 21)

Core UNTP data models (DPP, DCC, DFR, DIA, DTE v0.6.0–0.7.0) are seeded
automatically by the system seed and are available to all tenants.

### Workflow

After starting the services and logging in:

1. **Copper Mine** issues a Transformation Event (ore → concentrate), then a DPP
   for the concentrate, optionally a DFR for the facility
2. **Copper Smelter** issues a Transformation Event (concentrate → cathodes),
   then a DPP for the cathodes
3. **Battery Manufacturer** issues a Transformation Event (cathodes → batteries),
   then a DPP
4. **CopperMark/OrgBook/TSM** issue DCCs certifying the mine or smelter

All credential issuance uses `POST /api/v1/credentials` with the appropriate
`credentialType` and `version`.
