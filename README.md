# Plate Scan & Case Matching Service

Interview case study for Archetype Growth: a scoped full-stack slice of an LPR / vehicle-recovery platform.

## What it does

1. **Ingest a plate scan** from a truck camera (`POST /api/v1/scans`) — unauthenticated; tenant resolved from `camera_id`.
2. **Every scan is stored**. Then:
   - If the camera's tenant already has an **active** case for that VIN → attach to the location trail (**existing-case flow**).
   - Otherwise call the **mock eligibility** partner → if eligible, create a `pending_claim` case (**new-case flow**).
3. **Any tenant** can see and **claim** a `pending_claim` case.
4. Dashboard lists tenant cases, claimable pendings, and a VIN location trail.

## Stack

| Layer | Choice |
|--------|--------|
| API | Python FastAPI |
| DB | **PostgreSQL** (recommended — use your local install). SQLite works as a no-setup fallback. |
| UI | React + Vite + TypeScript |
| Auth | Simple JWT (username/password); not a real IdP |

**Docker is not required.** Prefer a Postgres database on your machine. `docker-compose.yml` is only an optional shortcut if you want a containerized Postgres instead.

## Quick start

### 0. Database (local PostgreSQL — recommended)

Create a database/user in your existing Postgres (psql, pgAdmin, etc.):

```sql
CREATE USER plate WITH PASSWORD 'plate';
CREATE DATABASE plate_scan OWNER plate;
```

Then set `backend/.env`:

```env
DATABASE_URL=postgresql_db_link
SECRET_KEY=secret-key
```

Use your own username/password if different. No Docker needed.

### 1. Backend

```bash
cd backend
python -m venv .venv

.\.venv\Scripts\activate

pip install -r requirements.txt
python -m seed
uvicorn app.main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173

### Seeded logins

| Tenant | Email | Password |
|--------|--------|----------|
| Recovery Agency A | `agent.a@agency-a.test` | `password` |
| Recovery Agency B | `agent.b@agency-b.test` | `password` |

### Demo both flows

1. Sign in as **Tenant A** → open the active case for VIN `1FTFW1E51NFA12345` → see older scans.
2. **Demo tools** → post **Existing-case flow** → trail grows.
3. Sign in as **Tenant B** (or stay on A) → **Demo tools** → post **New-case flow** (`cam_2050` / VIN `5NPE34AF9KH123456`) → creates `pending_claim`.
4. Sign in as **Tenant A** → claim that pending case (cross-tenant claim).

## API summary

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/auth/login` | — | OAuth2 password form → JWT |
| GET | `/api/v1/auth/me` | JWT | Current user + tenant |
| POST | `/api/v1/scans` | none | Camera webhook simulation |
| GET | `/api/v1/cases` | JWT | Own cases + all `pending_claim` |
| GET | `/api/v1/cases/{id}` | JWT | Case detail (tenant rules) |
| POST | `/api/v1/cases/{id}/claim` | JWT | Claim a pending case |
| GET | `/api/v1/cases/{id}/scans` | JWT | Location trail for case VIN |
| POST | `/mock/partner-network/eligibility` | none | Stub partner network |

## Database options

1. **Local PostgreSQL (recommended)** — see Quick start §0. Matches the case-study requirement; use whatever Postgres you already run on this machine.
2. **SQLite fallback** — if `DATABASE_URL` is unset or set to `sqlite:///./plate_scan.db`, the app uses a local file DB (fine for a quick demo only).
3. **Docker Postgres (optional)** — only if you prefer containers: `docker compose up -d` starts Postgres with user/password/db `plate` / `plate` / `plate_scan`. You do **not** need this if local Postgres already works.

After pointing `.env` at an empty database, run `python -m seed` once.

## Assumptions

- Pending cases have `tenant_id = null` until claimed; `originating_tenant_id` records which agency's camera created them.
- Only one `pending_claim` per VIN at a time (extra scans link to the existing pending case).
- Eligibility mock: VINs ending in `0` are not eligible; all others are.
- Location trail returns **all** scans for the VIN (any camera/tenant), ordered by time — useful for recovery; scoped visibility is enforced at the **case** level.
- Auth is intentionally minimal; multi-tenancy after login is the focus.

## Incomplete / simplified

- No real cameras, partner network, image storage, or notifications.
- No map UI (plain list trail).
- No Alembic migrations in the happy path (`create_all` on startup).
- Partial unique index “one active case per tenant+VIN” is enforced in application logic (DB partial unique index recommended for Postgres in production — see `DESIGN.md`).

## Design note

See [DESIGN.md](./DESIGN.md) for schema, multi-tenancy, and AWS sketch.
