# CRM Project Agent Context

Last updated: 2026-03-18

## Project Overview
- Project type: Next.js App Router application (TypeScript)
- Workspace root: `d:/work/dev/crm`
- Package manager/scripts: npm (`dev`, `build`, `start`, `lint`)
- Runtime stack: Next.js 16, React 19, Prisma 7, Neon/PostgreSQL (`@prisma/adapter-neon` + `@neondatabase/serverless`), Clerk authentication.

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
- Uses `@prisma/adapter-neon` (`PrismaNeonHttp`) with `@neondatabase/serverless`.
- Requires `DATABASE_URL` environment variable and throws if it is missing.
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

### 4. Authentication / Clerk
- Clerk is wired into `app/layout.tsx` via `ClerkProvider` and header components (`SignInButton`, `SignUpButton`, `UserButton`, `Show`).
- An example authenticated API route exists at `app/api/secure-api-route/route.ts` and returns the current `userId` or `401` when unauthenticated.
- Clerk configuration relies on the standard Next.js + Clerk environment variables (for example `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`) configured outside this repo.

### 5. Frontend State
- `app/page.tsx` renders a minimal CRM landing view (title and welcome text) but no data-driven dashboard yet.
- `app/layout.tsx` sets basic CRM metadata and wraps the app in `ClerkProvider` with a simple auth header (sign-in/sign-up or user menu).
- No CRM list/detail dashboard or user management UI has been implemented beyond this landing page.

## Current Known Gaps / Next Work
- Build CRM UI pages (list users, create/edit user forms, dashboard layout).
- Wire the CRM UI to `/api/users` endpoints.
- Add richer page metadata and navigation once the CRM screens exist.
- Extend Clerk-based authentication and authorization across pages and APIs (beyond the sample `secure-api-route`).
- Add tests (API and integration), since test setup is not present yet.
- Add seed and migration workflow notes in README.

## Environment Variables Expected
- `DATABASE_URL`
- Clerk environment variables per the Clerk + Next.js integration (for example `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`).

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
- Use this file as the canonical high-level project log: after each significant change, update "What Has Already Been Implemented" and "Current Known Gaps / Next Work" instead of creating new docs.
- When a gap from "Current Known Gaps / Next Work" is addressed, move or summarize it under "What Has Already Been Implemented" so future sessions can reconstruct the current state.
