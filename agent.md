# CRM Project Agent Context

Last updated: 2026-03-19

## Project Overview
- Project type: Next.js App Router application (TypeScript)
- Workspace root: `d:/work/dev/crm`
- Package manager/scripts: npm (`dev`, `build`, `start`, `lint`)
- Runtime stack: Next.js 16, React 19, Prisma 7, PostgreSQL (`pg`), Supabase SSR helpers

## What Has Already Been Implemented

### 1. Database Layer
- Prisma schema exists in `prisma/schema.prisma`.
- PostgreSQL datasource is configured.
- `Role` enum is defined with values: `ADMIN`, `MANAGER`, `USER`.
- `User` model is implemented with:
  - `id` (cuid), `email` (unique), `name`, `role`, `phone`, `avatarUrl`, `isActive`, `createdAt`, `updatedAt`.
- Table mapping is set with `@@map("users")`.

### 2. Prisma Client Setup
- Shared Prisma client is implemented in `lib/prisma.ts`.
- Uses `@prisma/adapter-pg` and `pg` pool.
- Requires `DATABASE_URL` environment variable.
- Reuses client instance via `globalThis` in non-production to avoid multiple client creation.

### 3. API Endpoints

#### Health Endpoint
- `GET /api/health` is implemented.
- Executes lightweight DB check (`SELECT 1`).
- Returns:
  - `200` with status `ok` when DB is reachable.
  - `503` with status `error` when DB is not reachable.

#### Users Collection
- `GET /api/users` is implemented with:
  - Filters: `role`, `isActive`, `search`
  - Pagination: `page`, `limit`
  - Sorting: `createdAt desc`
  - Response shape: `{ data, meta }`
- `POST /api/users` is implemented with:
  - Validation for `email`, `name`, optional `role`
  - Email normalization (`trim + lowercase`)
  - Prisma unique conflict handling (`P2002` -> `409`)

#### Single User
- `GET /api/users/[id]` is implemented.
- `PATCH /api/users/[id]` is implemented with:
  - Partial updates
  - Field validation (`email`, `name`, `role`, `isActive`)
  - `phone` and `avatarUrl` can be set to `null`
  - Prisma unique conflict handling (`P2002` -> `409`)
- `DELETE /api/users/[id]` is implemented.

#### Base API Route
- `GET /api` returns a simple hello message with optional `name` query string.

### 4. Supabase Utilities
- Supabase browser/server/middleware helpers exist in `utils/supabase/`:
  - `client.ts`
  - `server.ts`
  - `middleware.ts`
- They rely on:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- Note: helpers exist, but authentication flows and route protection are not wired into app pages yet.

### 5. Frontend State
- `app/page.tsx` is still default template UI content.
- `app/layout.tsx` metadata is default (`Create Next App`).
- No CRM dashboard or user management UI has been integrated yet.

## Current Known Gaps / Next Work
- Build CRM UI pages (list users, create/edit user forms).
- Wire frontend to `/api/users` endpoints.
- Replace default app metadata/title/description.
- Add authentication and authorization logic (if required).
- Add middleware usage and protected routes (if required).
- Add tests (API and integration), since test setup is not present yet.
- Add seed and migration workflow notes in README.

## Environment Variables Expected
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

## Conventions Already Used
- API handlers return JSON with explicit error messages and status codes.
- Validation is currently inline in route handlers (no shared validation library yet).
- User email values are normalized to lowercase before persistence.
- Pagination limits for users endpoint are capped at 100.

## Guidance For Future LLM Sessions
- Treat `/api/users` and Prisma schema as established baseline behavior.
- Prefer incremental changes that preserve existing API response shapes.
- If introducing shared validation, keep current validation semantics and status codes compatible.
- Before major refactors, verify compatibility with existing handlers in `app/api/users/`.
