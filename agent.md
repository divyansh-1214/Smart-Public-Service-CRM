# CRM Project Agent Context

Last updated: 2026-03-25

## Project Overview
- Project type: Next.js App Router application (TypeScript)
- Workspace root: `d:/work/dev/crm`
- Package manager/scripts: npm (`dev`, `build`, `start`, `lint`)
- Runtime stack: Next.js 16, React 19, Prisma 7, Neon/PostgreSQL (`@prisma/adapter-neon`), Clerk authentication.

## High-Level Architecture
- **UI layer (`app/**`, `components/**`)**
  - Citizen-facing CRM shell in `app/page.tsx` with tabs for dashboard/new grievance/history/map.
  - Admin dashboard in `app/admin/page.tsx` with complaint/user operations.
  - Reusable CRM components in `components/crm/*`.

- **API layer (`app/api/**`)**
  - 24 route handlers organized by domain (users, worker, department, complaint, assignment, escalation, audit, feedback, notifications, health, agents).
  - JSON-first response contracts with pagination and explicit error payloads.

- **Domain/services layer (`lib/**`)**
  - `lib/prisma.ts` for singleton Prisma client.
  - `lib/escalation.ts` for overdue assignment escalation logic.
  - `lib/agents/classifier.ts` for department classification via LangChain tool/agent flow.

- **Data layer (`prisma/schema.prisma`)**
  - PostgreSQL schema with complaint lifecycle, assignment history, notification, feedback, and system config tables.

- **Integration sandbox (`app/api-integration/**`)**
  - API Integration Studio UI/components/hooks plus `USER_GUIDE.md`.

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
- **Constraint**: `AssignmentOutcome` enum is defined locally in `app/api/complaint/assign/route.ts` instead of being imported from `@prisma/client` to ensure it's available at runtime. Schema values: `REASSIGNED`, `ESCALATED`, `RESOLVED`, `SELF_WITHDRAWN`, `ADMIN_REMOVED`.

### 3. API Endpoints

- **GET /api/dashboard/stats** — Returns real-time aggregation of complaint statistics
  - Aggregates: `total`, `open`, `overdue`, `escalated`, `resolved` counts.
  - Computes: 30-day trends (`+X.X%`, `-X.X%`) by comparing current period with previous 30-day window.
  - Implementation: Uses parallel Prisma `count()` calls for performance.

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

#### Officer Leave APIs
- **GET /api/officer/leave** — List leave records
  - Optional filters: `officerId`, `approved` (`true`/`false`), `upcoming` (`true` = `startDate >= today`)
  - Pagination: `page`, `limit` (max 100)
  - Response includes officer details (name, email, position, department)

- **POST /api/officer/leave** — Submit a leave request
  - Body: `officerId` (CUID), `startDate` (ISO date), `endDate` (ISO date), `reason` (optional, max 500)
  - Validates officer exists; `endDate` must be ≥ `startDate`
  - Blocks overlapping leaves for the same officer (returns `409` with conflicting leave details)
  - New leaves always start as `approved: false`

- **PATCH /api/officer/leave/[id]** — Update a leave record
  - Body (all optional, at least one required): `approved` (boolean), `startDate`, `endDate`, `reason`
  - Merges patch values over existing dates before validation
  - Overlap check excludes the current record itself
  - Returns `404` if not found, `409` if updated dates conflict with another leave

#### Department APIs
- `GET /api/department` lists departments with pagination/filtering.
- `POST /api/department` creates departments with `DepartmentName` enum validation and location/address fields.
- `GET /api/department/[id]` fetches one department.
- `PATCH /api/department/[id]` updates department metadata and location/address fields.
- `DELETE /api/department/[id]` prevents deletion when officers are assigned.

#### Complaint APIs
- `GET /api/complaint` lists complaints with pagination and citizen relation include.
- `POST /api/complaint` validates payload with Zod and creates complaint records.
- Complaint create route requires `citizenId` (CUID) and validates citizen existence/activity.
- Complaint create route auto-classifies department from description and persists both `DEPARTMENT_NAME` and `departmentId`.

#### Complaint Resolve APIs
- **GET /api/complaint/resolve/[id]** — Returns unresolved complaints (`resolvedAt = null`) with assigned officer include.
  - Note: the path includes `[id]` but the current GET implementation does not use the path param.
- **PATCH /api/complaint/resolve/[id]** — Marks a complaint as resolved (`status = RESOLVED`, `resolvedAt = now()`).
  - Current implementation does not set `resolvedById`.

#### Complaint Assignment APIs
- **POST /api/complaint/assign** — Create new complaint assignment
  - Input: `complaintId`, `officerId`, `assignedBy` (optional) from body or query params
  - Validation: Zod CUID strings, complaint exists, officer exists, officer is ACTIVE, officer belongs to complaint's department
  - Response: `201` with created assignment record, `400` for validation errors, `404` for missing records
  - Implementation: Uses Prisma delegate if available (`complaintAssignment?.create`), falls back to raw SQL INSERT/SELECT
  - Default dates: `assignedAt` = now, `deadline` = now + 7 days
  
- **PATCH /api/complaint/assign** — Update assignment outcome and performance note
  - Input (body only): `assignmentId` (required), `outcome` (optional), `performanceNote` (optional)
  - Validation: Must provide at least one field to update (outcome or performanceNote)
  - AssignmentOutcome enum values: `REASSIGNED`, `ESCALATED`, `RESOLVED`, `SELF_WITHDRAWN`, `ADMIN_REMOVED`
  - Response: `200` with updated assignment record, `400` for validation errors, `404` if assignment not found
  - Implementation: Use raw SQL for both exist-check and conditional field updates (outcome and performanceNote separately)

- **GET /api/complaint/assign/[id]** — Get assignment context and available officers
  - Returns complaint assignment context and department-scoped active officers for assignment reassignment

- **PATCH /api/complaint/assign/[id]** — Legacy single-officer assignment update (replaced by new PATCH /api/complaint/assign)
  - Updates assignment/status using primary officer selection

#### Audit Log APIs
- **GET /api/audit-log** — Fetch chronological audit trail for a complaint
  - Required: `complaintId` query param (CUID)
  - Optional filters: `updatedBy` (actor ID or `"system"`), `action` (e.g. `"assigned"`, `"escalated"`)
  - Pagination: `page`, `limit` (default 50, max 200)
  - Ordered `createdAt ASC` (oldest-first) for timeline rendering
  - `meta` includes `complaint` summary (`id`, `title`, `status`) for UI context

#### Notification APIs
- **GET /api/notifications** — List notifications for a user
  - Required query param: `userId` (CUID)
  - Optional filters: `unreadOnly` (`true`/`false`), `type` (NotificationType enum)
  - Pagination: `page` (default 1), `limit` (default 20, max 100)
  - Response includes `meta.unreadCount` (total unread for the user) for bell badge display
  - Ordered by `createdAt DESC`

- **PATCH /api/notifications/[id]/read** — Mark a single notification as read
  - Path param: `id` (notification CUID)
  - Sets `isRead = true` and `readAt = now()`
  - Idempotent — already-read notifications return current state
  - Returns `404` if notification not found

#### Feedback APIs
- **GET /api/feedback** — Retrieve feedback for a complaint
  - Required: `complaintId` query param (CUID)
  - Optional: `userId` (filter to one user's feedback), `page`, `limit`
  - Response includes `meta.averageRating` and `meta.totalFeedbacks` for the complaint
  - Anonymous submissions have `userId` and `user` fields stripped from the response

- **POST /api/feedback** — Submit feedback for a complaint
  - Body: `userId` (CUID), `complaintId` (CUID), `rating` (1–5 int), `comment` (optional, max 2000), `tags` (optional `FeedbackTag[]`), `isAnonymous` (optional, default `false`)
  - Validates that user and complaint exist; user must be active
  - Only allowed when complaint status is `RESOLVED` or `CLOSED` (returns `400` otherwise)
  - One feedback per user per complaint enforced by DB unique constraint; returns `409` on duplicate
  - Returns `201` with created feedback record

#### Agents APIs
- **GET /api/agents** — Basic health/test endpoint for agent flow.
- **POST /api/agents** — Accepts payload (`name`, `description`) and currently logs/echoes receipt with error handling.

### 4. Authentication / Clerk
- Clerk is wired into `app/layout.tsx` via `ClerkProvider` and auth UI components.
- `app/api/secure-api-route/route.ts` provides an authenticated sample route (`401` when unauthenticated).
- Clerk environment variables are expected outside repo config.

### 5. Frontend State
- `app/page.tsx` is a client-rendered CRM interface with Clerk user sync and tabbed views (dashboard/new/history/map).
- `app/admin/page.tsx` is implemented with complaint and user management workflows.
- Core CRM UI components exist in `components/crm/*` and are actively used.

### 6. Recent Database Sync Notes (Important)
- Schema push previously failed due to live data constraints while enforcing required complaint fields.
- Existing complaint rows were backfilled so `DEPARTMENT_NAME` is non-null and `departmentId` is valid.
- `npx prisma db push` now succeeds without `--force-reset`.

### 7. Deadline Escalation (Cron Job)
- **`lib/escalation.ts`** — Core escalation logic:
  - Queries `complaint_assignments` for overdue entries (`deadline < NOW()`, `outcome IS NULL`, `relievedAt IS NULL`).
  - Marks overdue assignment as `outcome = ESCALATED`, `relievedAt = NOW()`.
  - Bumps complaint `escalationLevel` to the next level (capped at `LEVEL_5`).
  - Finds a superior officer in the same department by position hierarchy: `JUNIOR → SENIOR → SUPERVISOR → MANAGER → DIRECTOR`.
  - Creates a new `ComplaintAssignment` for the superior with a fresh 7-day deadline.
  - Writes an `AuditLog` entry with trigger metadata.
- **`instrumentation.ts`** — Next.js instrumentation hook that starts a `node-cron` job every 15 minutes on server startup (Node.js runtime only).
- **`POST /api/cron/escalate`** — Manual trigger endpoint for the escalation check. Protected by `CRON_SECRET` env var via `x-cron-secret` header.

### 8. Frontend HTTP Client Standardization (Axios)
- Page-level API calls in `app/**/page.tsx` were migrated from `fetch` to `axios` for consistency.
- Migration completed across key citizen/admin/worker pages, including:
  - `app/page.tsx`
  - `app/admin/page.tsx`
  - `app/admin/analytics/page.tsx`
  - `app/admin/departments/page.tsx`
  - `app/admin/complaint/[id]/page.tsx`
  - `app/complaint/[id]/page.tsx`
  - `app/feedback/page.tsx`
  - `app/notifications/page.tsx`
  - `app/worker/dashboard/page.tsx`
  - `app/worker/complaint/[id]/page.tsx`
  - `app/worker/leave/page.tsx`
  - `app/worker/sync/page.tsx`
- Existing response envelope usage remains unchanged (`{ data, meta }`), now accessed through axios response objects.

## Current Known Gaps / Next Work
- Add authorization rules by role across API routes (not just authentication checks).
- Add tests (API and integration), since test setup is still minimal.
- Add seed and migration workflow notes in README.
- Replace placeholder response text in complaint create API and align response contract.
- If multi-worker complaint assignment is required, regenerate/apply Prisma schema-client alignment first, then restore worker-history writes in assignment APIs.
- Clarify/fix `/api/complaint/resolve/[id]` GET semantics (currently returns unresolved items and ignores path ID).
- Populate `resolvedById` when resolving complaints for stronger auditability.
- Complete `/api/agents` POST business logic beyond payload receipt.

## Environment Variables Expected
- `DATABASE_URL`
- Clerk environment variables per Next.js + Clerk integration (for example `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).

## Conventions Already Used
- API handlers return JSON with explicit error messages and status codes.
- Validation is currently inline in route handlers using Zod.
- User email values are normalized to lowercase before persistence.
- Pagination limits are capped at 100 where applicable.
- UI pages prefer `axios` for HTTP calls; use `response.data` / `response.data.data` according to route envelope.

## Guidance For Future LLM Sessions
- Treat existing `/api/users`, `/api/worker`, `/api/department`, and `/api/complaint` behavior as current baseline.
- The assignment creation and update flows are now fully implemented:
  - POST /api/complaint/assign creates assignments with full validation pipeline
  - PATCH /api/complaint/assign updates only outcome and performanceNote
  - Both routes use raw SQL fallback for missing Prisma delegates
  - AssignmentOutcome enum is defined locally in the route file (not imported from Prisma)
- Prefer incremental changes that preserve existing response shapes unless explicitly requested.
- When editing page-level data fetching/mutations in `app/**/page.tsx`, keep `axios` as the default client unless there is a specific reason not to.
- When changing Prisma-required fields on non-empty tables, plan a data backfill before enforcing NOT NULL/FK constraints.
- Before major refactors, verify compatibility with existing handlers in `app/api/**`.
- For assignment routes, keep responses as `4xx` for validation/domain failures instead of bubbling avoidable assignment errors into `500`.
- Keep this file as the canonical high-level project log and update it after significant changes.
- When adding to assign routes or modifying enum values, update both the schema.prisma and the local enum definition in route.ts.
- Note that `middleware.ts` currently marks `/api/(.*)` as public; endpoint-level auth/authorization must be enforced inside route handlers.
