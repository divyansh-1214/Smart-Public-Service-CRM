# CRM Project Agent Context

Last updated: 2026-03-22

## Project Overview
- Project type: Next.js App Router application (TypeScript)
- Workspace root: `d:/work/dev/crm`
- Package manager/scripts: npm (`dev`, `build`, `start`, `lint`)
- Runtime stack: Next.js 16, React 19, Prisma 7, Neon/PostgreSQL (`@prisma/adapter-neon` + `@neondatabase/serverless`), Clerk authentication.

## What Has Already Been Implemented

### 1. Database Layer
- Prisma schema exists in `prisma/schema.prisma`.
- PostgreSQL datasource is configured.
- Core enums and models are implemented for complaint workflow:
  - Enums include `Role`, `ComplaintStatus`, `Priority`, `ComplaintCategory`, `DepartmentName`, `OfficerStatus`, `EscalationLevel`, `Position`, `NotificationType`, `FeedbackTag`.
  - Models include `User`, `Officer`, `Department`, `Complaint`, `OfficerLeave`, `AuditLog`, `Feedback`, `Notification`, `SystemConfig`, `AICategoryPrediction`.
- `Department` includes geolocation/address fields:
  - `locationLat`, `locationLng`, `addressLine`, `city`, `pincode`.
- `Complaint` includes both:
  - `DEPARTMENT_NAME` (enum), and
  - `departmentId` relation to `Department`.

### 2. Prisma Client Setup
- Shared Prisma client is implemented in `lib/prisma.ts`.
- Uses `@prisma/adapter-neon` (`PrismaNeonHttp`) with `@neondatabase/serverless`.
- Requires `DATABASE_URL` environment variable and throws if it is missing.
- Reuses client instance via `globalThis` in non-production to avoid multiple client creation.

### 3. API Endpoints

#### Base and Health
- `GET /api` returns a simple hello message with optional `name` query string.
- `GET /api/health` is implemented with a DB connectivity check (`SELECT 1`).

#### Users APIs
- `GET /api/users` supports filters (`role`, `isActive`, `search`) and pagination (`page`, `limit`).
- `POST /api/users` validates input, normalizes email, and handles unique constraint conflicts (`P2002` -> `409`).
- `GET /api/users/[id]`, `PATCH /api/users/[id]`, and `DELETE /api/users/[id]` are implemented.
- `PATCH /api/users/[id]` supports partial updates with validation and uniqueness handling.
- `GET /api/users/sync` and `POST /api/users/sync` are active and used with Clerk-backed syncing.

#### Worker (Officer) APIs
- Worker routes are aligned to the `Officer` model (not `User`).
- `GET /api/worker` supports filtering (`status`, `position`, `departmentId`, `search`) plus pagination.
- `POST /api/worker` creates officers with validation and department existence check.
- `GET /api/worker/[id]`, `PATCH /api/worker/[id]`, and `DELETE /api/worker/[id]` are implemented.
- `GET /api/worker/sync` and `POST /api/worker/sync` integrate Clerk identity with officer records.

#### Department APIs
- `GET /api/department` lists departments with pagination/filtering.
- `POST /api/department` creates departments with `DepartmentName` enum validation and location/address fields.
- `GET /api/department/[id]` fetches one department.
- `PATCH /api/department/[id]` updates department metadata and location/address fields.
- `DELETE /api/department/[id]` prevents deletion when officers are assigned.

#### Complaint APIs
- `GET /api/complaint` lists complaints with pagination and citizen relation include.
- `POST /api/complaint` validates payload with Zod and creates complaint records.
- Complaint create route currently defaults `citizenId` to `cmmwnbwv200008goismex9hsg` when omitted.

### 4. Authentication / Clerk
- Clerk is wired into `app/layout.tsx` via `ClerkProvider` and auth UI components.
- `app/api/secure-api-route/route.ts` provides an authenticated sample route (`401` when unauthenticated).
- Clerk environment variables are expected outside repo config.

### 5. Frontend State
- `app/page.tsx` is still a minimal landing page.
- No data-driven CRM dashboard UI has been implemented yet.

### 6. Recent Database Sync Notes (Important)
- Schema push previously failed due to live data constraints while enforcing required complaint fields.
- Existing complaint rows were backfilled so `DEPARTMENT_NAME` is non-null and `departmentId` is valid.
- `npx prisma db push` now succeeds without `--force-reset`.

## Current Known Gaps / Next Work
- Build CRM UI pages (users/workers/departments/complaints management views).
- Add authorization rules by role across API routes (not just authentication checks).
- Add tests (API and integration), since test setup is still minimal.
- Add seed and migration workflow notes in README.
- Replace placeholder response text in complaint create API and align response contract.
- Ensure complaint creation consistently maps/validates `DEPARTMENT_NAME` and `departmentId` together.

## Environment Variables Expected
- `DATABASE_URL`
- Clerk environment variables per Next.js + Clerk integration (for example `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).

## Conventions Already Used
- API handlers return JSON with explicit error messages and status codes.
- Validation is currently inline in route handlers using Zod.
- User email values are normalized to lowercase before persistence.
- Pagination limits are capped at 100 where applicable.

## Guidance For Future LLM Sessions
- Treat existing `/api/users`, `/api/worker`, `/api/department`, and `/api/complaint` behavior as current baseline.
- Prefer incremental changes that preserve existing response shapes unless explicitly requested.
- When changing Prisma-required fields on non-empty tables, plan a data backfill before enforcing NOT NULL/FK constraints.
- Before major refactors, verify compatibility with existing handlers in `app/api/**`.
- Keep this file as the canonical high-level project log and update it after significant changes.
