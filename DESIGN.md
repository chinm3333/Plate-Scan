# Design note — Plate Scan & Case Matching Service

## 1. Database schema

```
tenants 1──* users
tenants 1──* cameras
tenants 1──* cases (as assigned tenant; null while pending)
tenants 1──* cases (as originating_tenant)
cameras 1──* scans
cases   1──* scans (optional matched_case_id)
users   1──* cases (assigned_agent)
```

### Tables (conceptual)

| Table | Key fields |
|--------|------------|
| **tenants** | id, name |
| **users** | id, tenant_id, email, hashed_password, role (staff/admin) |
| **cameras** | id (e.g. `cam_1001`), tenant_id, label — maps unauthenticated scans → tenant |
| **cases** | id, vin, plate, status (`pending_claim` \| `active` \| `closed`), tenant_id (null until claim), originating_tenant_id, assigned_agent_id, claimed_at |
| **scans** | id, camera_id, tenant_id, plate, vin, lat/lng, scanned_at, image_url, matched_case_id |

### Indexes worth having in production Postgres

- `scans(vin, scanned_at)` — location trail
- `cases(status)`, `cases(tenant_id, status)`
- Partial unique: `UNIQUE (tenant_id, vin) WHERE status = 'active'` — one active case per tenant+VIN

## 2. Multi-tenancy & access control

**Ingest path (no login)**  
Tenant is derived only from `camera_id`. Scans are always written with that camera's `tenant_id`.

**Authenticated paths**  
JWT identifies a user who belongs to exactly one tenant.

| Resource | Rule |
|----------|------|
| List cases | `(tenant_id = me)` **OR** `status = pending_claim` |
| View case / trail | Allowed if pending_claim **or** `case.tenant_id = me` |
| Claim | Any authenticated user may claim `pending_claim`; sets `tenant_id`, `assigned_agent_id`, `status=active` |
| Active/closed of other tenants | Never returned |

This is the deliberate exception: pending cases are a shared claim queue; everything else is hard-isolated by tenant.

**Application-layer enforcement**  
All case queries go through helpers (`list_visible_cases`, `assert_can_view_case`). In production, consider Postgres Row Level Security (RLS) as defense in depth, with `app.tenant_id` set per request.

## 3. Request flow (scan ingest)

```
POST /scans
  → resolve camera → tenant
  → INSERT scan (always)
  → active case for (tenant, vin)?
        yes → link scan to case  [existing-case flow]
        no  → POST mock eligibility
                not eligible → done
                eligible → create pending_claim (or attach to existing pending for VIN)
```

Dashboard never calls ingest; it only uses authenticated case APIs.

## 4. AWS deployment sketch (not implemented)

Suggested shape for real traffic:

| Concern | Service |
|---------|---------|
| API containers | **ECS Fargate** (or App Runner) behind an **ALB** |
| DB | **RDS PostgreSQL** (Multi-AZ), private subnets |
| Secrets | **Secrets Manager** / SSM Parameter Store |
| Auth (later) | Cognito or Auth0; keep tenant claim in token |
| Images | **S3** (+ CloudFront); store URL on scan |
| Ingest scale | Camera webhooks → **API Gateway** + **SQS** → workers if bursty |
| Observability | CloudWatch metrics/logs, alarms on 5xx and queue depth |
| Multi-tenant isolation | App filters + optional RLS; separate KMS keys only if compliance demands |

**Scale notes**

- Scan ingest is write-heavy and should stay cheap/fast (append-only scans + async eligibility if partner latency grows).
- Case list is tenant-scoped with a narrow exception for pending — cache carefully or not at all for claim races.
- Claim should be a single transactional `UPDATE … WHERE status = 'pending_claim'` so only one tenant wins.

## 5. Notifications (described, not built)

On claim / new pending: publish to SNS or EventBridge → email/SMS/push per tenant preferences. Keep notification side-effects out of the claim transaction (outbox pattern).
