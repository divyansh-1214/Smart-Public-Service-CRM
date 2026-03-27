# CRM Project Agent Context

Last updated: 2026-03-27

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
  - `lib/cloudinary.ts` for server-side Cloudinary SDK integration (lazy-init pattern, uploads, transforms, deletions).
  - `lib/upload-validators.ts` for file type/size/count validation rules and Zod schema.
  - `lib/worker-auth.ts` for worker session JWT authentication (existing).

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
- `GET /api/complaint?mode=map` returns map-ready complaint markers with valid coordinates only.
  - Map mode payload fields: `id`, `title`, `priority`, `status`, `ward`, `locationAddress`, `lat`, `lng`, `createdAt`.
  - Optional status filters supported via `status` / `statuses` (comma-separated).
  - Existing default list response shape remains unchanged for non-map calls.
- `POST /api/complaint` validates payload with Zod and creates complaint records.
- Complaint create route requires `citizenId` (CUID) and validates citizen existence/activity.
- Complaint create route auto-classifies department from description and persists both `DEPARTMENT_NAME` and `departmentId`.
- `PATCH /api/complaint/[id]` supports status/priority updates for non-resolved states.
  - `RESOLVED` is intentionally blocked here and must use `PATCH /api/complaint/resolve/[id]`.

#### Map Data APIs
- **GET /api/wards** — Fetches and normalizes MCD ward/zone geometry from remote JS-wrapped GeoJSON sources.
  - Sources: `https://webmap.mcd.gov.in/data/ward_3.js`, `https://webmap.mcd.gov.in/data/zone_4.js`.
  - Returns normalized `wards` + `zones` FeatureCollections and centroid points (`centroids.wards`, `centroids.zones`).
  - Includes cache headers for upstream payload stability and performance.

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

#### File Upload API
- **POST /api/upload** — Secure authenticated multipart file upload to Cloudinary
  - Auth: Requires Clerk session or worker session JWT
  - Body: `multipart/form-data` with `files` field (0-10 files per request)
  - Validation: Client validates; server validates MIME type, file size (images ≤10MB, videos ≤100MB, PDFs ≤20MB), file count
  - Upload: Streams files to Cloudinary with public_id naming (folder routing by user type: crm/evidence for workers, crm/complaints for citizens)
  - Response: `200` with normalized metadata array including `publicId`, `secureUrl`, `resourceType`, `format`, `bytes`, `cardImageUrl` (optimized preview)
  - Partial success: `207` Multi-Status if some files fail; all fail returns `400`
  - Error handling: Descriptive messages for common failures (bad type, oversized, auth failure)

- **DELETE /api/upload?publicId=xxx** — Remove asset from Cloudinary
  - Auth: Requires Clerk or worker session
  - Query param: `publicId` (Cloudinary asset ID to delete)
  - Response: `200` on success, `404` if asset not found, `401` if not authenticated
  - Implementation: Calls Cloudinary `api.resource()` delete endpoint

#### Agents APIs
- **GET /api/agents** — Basic health/test endpoint for agent flow.
- **POST /api/agents** — Accepts payload (`name`, `description`) and currently logs/echoes receipt with error handling.
- **POST /api/agents/transcribe** — Groq-powered speech-to-text endpoint for complaint voice input.
  - Input: `multipart/form-data` with `audio` file and optional `language` (`auto` supported).
  - Validation: Rejects empty payloads, unsupported MIME types, and files larger than 15MB.
  - Output: Normalized transcription payload (`text`, `language`, `duration`, `model`).
- **POST /api/agents** — Handles Vapi tool-call webhooks for voice assistant integration.
  - Processes `tool-calls` payload with `toolWithToolCallList` array.
  - Implemented tools:
    - `checkComplaintStatus` (queries DB for complaint status)
    - `createComplaint` (creates real complaint records in DB)
      - Resolves citizen identity from `citizenId` OR `userEmail`/`email` tool args
      - Falls back to Clerk signed-in user context when available
      - Auto-creates DB user from Clerk profile if missing (best-effort)
      - Auto-classifies department and auto-generates complaint title before insert
      - Applies defaults for category/priority and stores optional location/media fields
  - Returns `{ results: [{ toolCallId, result }] }` array for Vapi callback.
  - Fallback for unimplemented tools with error message.

### 4. Authentication / Clerk
- Clerk is wired into `app/layout.tsx` via `ClerkProvider` and auth UI components.
- `app/api/secure-api-route/route.ts` provides an authenticated sample route (`401` when unauthenticated).
- Clerk environment variables are expected outside repo config.

### 5. Frontend State & Components
- `app/page.tsx` (now `app/dashboard/page.tsx` in production) is a client-rendered CRM interface with Clerk user sync and tabbed views (dashboard/new/history/map).
- `app/admin/page.tsx` is implemented with complaint and user management workflows.
- Core CRM UI components exist in `components/crm/*` and are actively used:
  - **`components/crm/CRMMap.tsx`** (UPDATED) — Leaflet map now supports:
    - Ward and zone boundary layer rendering from `/api/wards`
    - Ward/zone centroid rendering
    - Complaint marker rendering from `/api/complaint?mode=map` (priority-based colors)
    - Ward search and fit-to-bound behavior
    - Graceful partial failure messaging if layers/complaints fail independently
  - **`components/crm/FileUploader.tsx`** (NEW) — Production-grade reusable file uploader with:
    - Drag-and-drop zone with hover states
    - File preview grid (image thumbnails + PDF icons)
    - Upload progress tracking with animated spinners
    - Error display and clear button
    - Support for images, videos, PDFs (configurable via props)
    - Partial upload handling (some success, some fail)
    - Integration with `/api/upload` endpoint
    - Props: `value` (URL[]), `onChange` (callback), `maxFiles`, `maxSizePerFile`, `acceptedTypes`, `label`, `description`
  - **`components/crm/QuickComplaintForm.tsx`** (NEW) — Streamlined single-page complaint submission with:
    - Description textarea (10-1000 chars, real-time counter)
    - Voice-to-text mode (browser recording + Groq transcription + auto-fill description)
    - Auto-location detection via browser geolocation (shows lat/lng with refresh button)
    - Image upload integration via FileUploader (0-5 files)
    - Auto-submit to `/api/complaint` with success/error states
    - Category & priority default to `OTHER` and `MEDIUM` (hidden from user)
    - Smooth animations and responsive design
    - Citizen speedup over old 4-step GrievanceForm
  - **`components/crm/GrievanceForm.tsx`** (UPDATED) — Legacy 4-step form now has FileUploader integrated at step 2
    - Kept for backward compatibility; used in certain workflows
    - Still supports full category/priority selection and location management
  - **`components/crm/VapiButton.tsx`** (NEW) — Voice AI assistant button with real-time chat interface.
    - Dynamic import of `@vapi-ai/web` SDK with lazy instantiation.
    - Event listeners for call-start/end, message transcripts, and tool-call notifications.
    - Floating chat window with live conversation display and status indicators.
    - Requires `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID` env vars.
    - Integrated in `components/layout/Navbar.tsx` for global access.

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

## Environment Variables Expected
- **Database**: `DATABASE_URL` (PostgreSQL connection string for Neon)
- **Clerk**: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`
- **Cloudinary** (NEW):
  - `CLOUDINARY_CLOUD_NAME` (required for uploads)
  - `CLOUDINARY_API_KEY` (required for uploads)
  - `CLOUDINARY_API_SECRET` (required, server-side only, **never expose to browser**)
  - Optional: `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, `CLOUDINARY_UPLOAD_FOLDER`
- **Cron Jobs**: `CRON_SECRET` (for `/api/cron/escalate` endpoint protection)
- **AI/Transcription**: `GROQ_API_KEY` (used for Gemini fallback and voice transcription endpoint)
- **Vapi** (NEW):
  - `NEXT_PUBLIC_VAPI_PUBLIC_KEY` (required for voice assistant SDK)
  - `NEXT_PUBLIC_VAPI_ASSISTANT_ID` (required for voice assistant configuration)

## Conventions Already Used
- API handlers return JSON with explicit error messages and status codes.
- Validation is currently inline in route handlers using Zod.
- User email values are normalized to lowercase before persistence.
- Pagination limits are capped at 100 where applicable.
- UI pages prefer `axios` for HTTP calls; use `response.data` / `response.data.data` according to route envelope.
- **File Upload Validation** (NEW):
  - Client-side validation in FileUploader: type & size checks before network request
  - Server-side validation in `/api/upload`: re-validates MIME type, size, count (defense in depth)
  - File size limits configurable per file type via `lib/upload-validators.ts`
  - Cloudinary public_id naming includes timestamp + sanitized filename to prevent collisions
  - Upload folder routing by user type: `crm/evidence/` for workers, `crm/complaints/` for citizens
- **Cloudinary Integration Pattern** (NEW):
  - Lazy-init pattern in `lib/cloudinary.ts`: env vars checked at runtime (not build time) to avoid compile errors
  - All Cloudinary operations (upload, transform, delete) abstract away public_id format
  - URL transformation helpers return optimized URLs with auto-format, quality, and crop settings
  - Server-side secrets (`CLOUDINARY_API_SECRET`) never exposed; all auth via server-signed endpoints

## Guidance For Future LLM Sessions
- Treat existing `/api/users`, `/api/worker`, `/api/department`, and `/api/complaint` behavior as current baseline.
- The assignment creation and update flows are now fully implemented:
  - POST /api/complaint/assign creates assignments with full validation pipeline
  - PATCH /api/complaint/assign updates only outcome and performanceNote
  - Both routes use raw SQL fallback for missing Prisma delegates
  - AssignmentOutcome enum is defined locally in the route file (not imported from Prisma)
- **File Upload & Cloudinary Integration** (NEW):
  - `/api/upload` endpoint is production-ready with Clerk + worker auth support
  - FileUploader component is reusable and self-contained (no Redux dependency)
  - Cloudinary lazy-init in `lib/cloudinary.ts` prevents build-time env var errors
  - All file validation rules centralized in `lib/upload-validators.ts` for consistency
  - QuickComplaintForm is the new default for citizen submissions (single-page, fast)
  - GrievanceForm is legacy but still available for workflows needing category/priority selection
  - When integrating uploads into new forms, wire FileUploader via `onChange` callback to update parent state
  - Complaint model already supports `photosUrls[]` and `videoUrls[]` arrays; no schema migration needed
- Prefer incremental changes that preserve existing response shapes unless explicitly requested.
- When editing page-level data fetching/mutations in `app/**/page.tsx`, keep `axios` as the default client unless there is a specific reason not to.
- When changing Prisma-required fields on non-empty tables, plan a data backfill before enforcing NOT NULL/FK constraints.
- Before major refactors, verify compatibility with existing handlers in `app/api/**`.
- For assignment routes, keep responses as `4xx` for validation/domain failures instead of bubbling avoidable assignment errors into `500`.
- Keep this file as the canonical high-level project log and update it after significant changes.
- When adding to assign routes or modifying enum values, update both the schema.prisma and the local enum definition in route.ts.
- Note that `middleware.ts` currently marks `/api/(.*)` as public; endpoint-level auth/authorization must be enforced inside route handlers.
- For Cloudinary integration: env vars are lazy-loaded, so builds work even before env is set; always call `ensureConfigured()` before using SDK operations.
- File upload errors should be user-friendly and actionable (e.g., "File size exceeds 10MB limit" not "413 Payload Too Large").
- When adding new complaint form variants, prefer QuickComplaintForm (auto-location, fast) unless category/priority selection is required.
- AI reliability conventions:
  - Department classification path: Gemini first, then Groq fallback, then deterministic keyword fallback.
  - Complaint-title generation path: Gemini first, then Groq fallback, then deterministic text-derived fallback.

## Recent Changes (Session: 2026-03-26)

### Voice-to-Text Complaint Mode

**Objective**: Let citizens dictate complaints and auto-fill text fields through Groq speech-to-text.

**Implementation**:
1. **Groq transcription API**:
  - Added `POST /api/agents/transcribe` for multipart audio transcription.
  - Uses `whisper-large-v3-turbo` with auto-language handling and normalized JSON output.
  - Added defensive validation for file size/type and provider error normalization.

2. **Quick complaint voice UX**:
  - Updated `components/crm/QuickComplaintForm.tsx` with in-browser recording controls (start/stop/clear).
  - Added transcription action that sends recorded audio to `/api/agents/transcribe`.
  - Auto-fills complaint description with returned transcript and preserves form validation behavior.

**Build/Diagnostics Status**: ✅ Integrated in-session; ready for runtime test with `GROQ_API_KEY`.

### Map + AI Reliability Enhancements

**Objective**: Improve operational map visibility and AI resiliency under provider failures.

**Implementation**:
1. **Complaint map overlay support**:
  - Extended `GET /api/complaint` with `mode=map` for coordinate-valid complaint marker payloads.
  - Added optional status filtering (`status` / `statuses`) in map mode.
  - Preserved existing response behavior for non-map calls.

2. **Ward/zone boundary ingestion**:
  - Added `GET /api/wards` to ingest remote ward/zone JS datasets and normalize them into GeoJSON.
  - Added centroid generation for ward and zone labeling support.

3. **Leaflet map integration**:
  - Updated `components/crm/CRMMap.tsx` to render boundaries, centroids, and complaint markers in one map canvas.
  - Added priority-based complaint marker coloring and complaint context popups.

4. **AI provider fallback hardening**:
  - Updated `lib/agents/classifier.ts`: Gemini -> Groq -> keyword fallback.
  - Updated `lib/agents/classifydep.ts`: Gemini -> Groq -> deterministic fallback title.

**Build/Diagnostics Status**: ✅ Touched files pass diagnostics in-session.

### Cloudinary Media Integration (Phases 1-2 Complete)

**Objective**: Secure server-side file uploads for complaint photos, videos, PDFs, and user avatars.

**Implementation**:
1. **lib/cloudinary.ts** — Server-side Cloudinary client wrapper with:
   - Lazy-init pattern (`ensureConfigured()`) to defer env var checks from build time to runtime
   - `uploadFileToCloudinary(buffer, filename, folder)` — Streams file to Cloudinary, returns normalized metadata
   - `buildOptimizedImageUrl(publicId, options)` — Custom transforms with width/height/crop/quality
   - `buildAvatarUrl(publicId, size)` — Auto face-crop for profile images
   - `buildCardImageUrl(publicId, w, h)` — Landscape crop for complaint preview cards
   - `deleteCloudinaryAsset(publicId)` — Asset removal
   - `isCloudinaryUrl(url)` — Validation helper

2. **lib/upload-validators.ts** — Centralized validation rules:
   - `ALLOWED_IMAGE_TYPES`, `ALLOWED_VIDEO_TYPES`, `ALLOWED_DOCUMENT_TYPES` enums
   - `FILE_SIZE_LIMITS` object (images 10MB, videos 100MB, PDFs 20MB)
   - `MAX_FILES_PER_UPLOAD = 10`
   - `validateFile()`, `validateFileType()`, `validateFileSize()`, `validateFileCount()` functions
   - Zod schema `uploadFileSchema` for API request validation

3. **app/api/upload/route.ts** — Secure authenticated upload endpoint:
   - **POST** — Multipart file upload
     - Auth: Clerk session + worker session (JWT) support
     - Validation: File type, size, count (client + server-side)
     - Upload: Loops through files, calls `uploadFileToCloudinary()`, handles partial success
     - Response: `{urls: [{publicId, secureUrl, resourceType, format, bytes, cardImageUrl?}], metadata: {totalFiles, totalBytes, uploadedAt, userId?, officerId?}}`
     - Errors: `400` (validation), `401` (auth), `207` (partial success)
   - **DELETE** — Asset cleanup
     - Auth: Clerk or worker session required
     - Query param: `publicId` (asset to delete)
     - Response: `{message: "Asset deleted successfully."}`
     - TODO: Add ownership verification per user/officer

4. **components/crm/FileUploader.tsx** — Reusable React uploader component:
   - Drag-and-drop zone with click-to-select fallback
   - File preview grid (image thumbnails, PDF icons)
   - Real-time upload progress bars
   - Remove buttons for individual files (hover state)
   - Error display with clear button
   - Support for images, videos, PDFs (configurable)
   - Optimistic state; integrates with Cloudinary URLs
   - Props: `value` (URLs), `onChange` (parent callback), `maxFiles`, `maxSizePerFile`, `acceptedTypes`, `label`, `description`

5. **components/crm/QuickComplaintForm.tsx** (NEW) — Simplified citizen complaint form:
   - Single-page form (no step progression)
   - Fields: description (10-1000 chars), photos (0-5 files via FileUploader), location (auto-detected via browser geolocation)
   - Hidden fields: category (defaults to OTHER), priority (defaults to MEDIUM)
   - Auto-location: On mount, browser geolocation detected; user can refresh
   - Submits to `/api/complaint` with all fields; success message + auto-redirect to history
   - Real-time description character counter
   - Location shows lat/lng with 4-decimal precision

6. **components/crm/GrievanceForm.tsx** (UPDATED):
   - Integrated FileUploader into step 2 (details) after description textarea
   - Wired to `photosUrls` state via `react-hook-form` `setValue()`
   - Still supports full category/priority selection and manual location management (4-step flow)

7. **app/dashboard/page.tsx** (UPDATED):
   - Replaced `GrievanceForm` import with `QuickComplaintForm`
   - "Submit Grievance" tab now renders QuickComplaintForm (faster, simpler UX)
   - Old GrievanceForm still available in codebase for backward compatibility

8. **Environment Setup**:
   - `.env.example` created with Cloudinary credentials template
   - Required vars: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (server-side only)

**Build Status**: ✅ `npm run build` succeeds (compiled in 7.9s, no TypeScript errors)

**Testing Status**: Ready for manual testing via dashboard UI
- Submit Grievance tab → Fill description → Allow location → Upload photos → Submit → Verify in history

**Next Steps** (Phases 3-6):
- [ ] Phase 3: Update complaint detail display surfaces (admin/worker pages) to render Cloudinary images + PDFs
- [ ] Phase 4-5: Avatar integration (wire FileUploader to user/officer profile edit flows, use `buildAvatarUrl()` for rendering)
- [ ] Phase 6: Hardening (rate limiting, enhanced error messages, README docs, ownership verification for DELETE)

## Recent Changes (Session: 2026-03-27)

### Vapi Voice Assistant Integration

**Objective**: Add real-time voice AI assistant for complaint management and status inquiries.

**Implementation**:
1. **VapiButton component** (`components/crm/VapiButton.tsx`):
   - Client-side voice assistant with floating chat UI.
   - Dynamic SDK import and instance management.
   - Event-driven chat updates (transcripts, tool calls, status).
   - Integrated into Navbar for global access.

2. **Agents API enhancement** (`app/api/agents/route.ts`):
   - POST endpoint now handles Vapi tool-call webhooks.
   - Supports `checkComplaintStatus` tool: DB lookup with status/title/priority response.
   - Supports `createComplaint` tool: Stub response for voice submissions.
   - Structured results array for Vapi callback integration.

3. **Environment configuration**:
   - Added `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID` requirements.
   - Client-side env vars for SDK initialization.

**Build/Diagnostics Status**: ✅ Touched files pass diagnostics in-session.

**Testing Status**: Ready for manual testing via Navbar voice button
- Click "Voice AI" → Allow mic → Speak complaint inquiry → See live transcript and tool responses

### Voice Agent Complaint Creation (DB + Clerk Mapping)

**Objective**: Connect voice tool calls to real complaint creation with Clerk-linked user resolution.

**Implementation**:
1. **Agents route upgrade** (`app/api/agents/route.ts`):
  - `createComplaint` tool now inserts complaint rows into Prisma DB (no longer stubbed).
  - Parses tool-call arguments safely and returns per-tool actionable errors.

2. **Citizen resolution flow**:
  - Priority order: `citizenId` (DB ID) -> `userEmail` / `email` (tool args) -> Clerk auth context.
  - If DB user by email is missing and Clerk context exists, creates Prisma `User` record automatically.

3. **Complaint enrichment**:
  - Department classification via `classifyDepartmentWithAgent()` with fallback handling.
  - Title generation via `decideDiscription()` with deterministic fallback.
  - Stores optional location, ward/pincode, tags, media arrays and attachment count.

4. **Response behavior**:
  - Returns tool result string including complaint ID, title, status, priority, and department.
  - Uses no-store headers for all agent responses.

**Build/Diagnostics Status**: ✅ Touched files pass diagnostics in-session.

### Worker Complaint Status Update Guardrails

**Objective**: Allow worker-driven status progression while keeping resolution as an explicit dedicated action.

**Implementation**:
1. **Complaint PATCH API guard** (`app/api/complaint/[id]/route.ts`):
  - Blocks `status = RESOLVED` in `PATCH /api/complaint/[id]` with `400` and guidance to use resolve endpoint.
  - Keeps status/priority updates available for other states.

2. **Worker complaint UI update** (`app/worker/complaint/[id]/page.tsx`):
  - Status dropdown excludes `RESOLVED`.
  - Resolution remains available via dedicated "Resolve Case" action (`/api/complaint/resolve/[id]`).

**Build/Diagnostics Status**: ✅ Touched files pass diagnostics in-session.

### Complaint Notification Triggers (Implementation Started)

**Objective**: Notify relevant roles when complaint assignment and resolution events occur.

**Implementation**:
1. **Assignment notifications** (`app/api/complaint/assign/route.ts`):
  - On successful complaint assignment, creates `COMPLAINT_ASSIGNED` notification for:
    - complaint citizen (`complaint.citizenId`), and
    - assigned worker user (best-effort lookup via officer email in `User`).
  - Adds `complaintId`, `channels: ["in_app"]`, and `deliveredAt` metadata.
  - Writes best-effort `notification_sent` audit entry.

2. **Resolution notification** (`app/api/complaint/resolve/[id]/route.ts`):
  - On successful resolve, creates `COMPLAINT_RESOLVED` notification for complaint citizen.
  - Adds `complaintId`, `channels: ["in_app"]`, and `deliveredAt` metadata.
  - Writes best-effort `notification_sent` audit entry.

3. **Reliability behavior**:
  - Notification creation is non-blocking for core assignment/resolve workflows.
  - If notification write fails, API still returns success for primary complaint action and logs error.

**Build/Diagnostics Status**: ✅ Touched files pass diagnostics in-session.
