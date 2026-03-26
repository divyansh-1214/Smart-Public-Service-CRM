# CRM

Citizen complaint management system built with Next.js App Router, Prisma, PostgreSQL (Neon), and Clerk authentication.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript
- Prisma 7 + PostgreSQL
- Neon adapter (`@prisma/adapter-neon`)
- Clerk (`@clerk/nextjs`)
- Zod validation
- LangChain-based department classification

## Project Architecture

- `app/`: App Router pages and API routes.
- `app/page.tsx`: Citizen-facing CRM interface.
- `app/admin/page.tsx`: Admin dashboard UI.
- `app/api/**`: Backend endpoints grouped by domain.
- `components/crm/`: Reusable CRM UI components.
- `lib/`: Prisma client, escalation logic, and classifier agent.
- `prisma/schema.prisma`: Complaint workflow database schema.
- `app/api-integration/`: API Integration Studio UI, hooks, and guide.

## Implemented API Surface

- Base and health: `GET /api`, `GET /api/health`
- Users: `GET/POST /api/users`, `GET/PATCH/DELETE /api/users/[id]`, `GET/POST /api/users/sync`
- Workers (officers): `GET/POST /api/worker`, `GET/PATCH/DELETE /api/worker/[id]`, `GET/POST /api/worker/sync`
- Officer leave: `GET/POST /api/officer/leave`, `PATCH /api/officer/leave/[id]`
- Departments: `GET/POST /api/department`, `GET/PATCH/DELETE /api/department/[id]`
- Complaints: `GET/POST /api/complaint`, `GET/PATCH /api/complaint/resolve/[id]`
- Assignment: `POST/PATCH /api/complaint/assign`, `GET/PATCH /api/complaint/assign/[id]`
- Monitoring and workflow: `GET /api/dashboard/stats`, `GET/POST /api/cron/escalate`, `GET /api/audit-log`
- Feedback and notifications: `GET/POST /api/feedback`, `GET /api/notifications`, `PATCH /api/notifications/[id]/read`
- Agents: `GET/POST /api/agents`

## Authentication and Authorization

- Clerk is wired in `app/layout.tsx` and `middleware.ts`.
- `middleware.ts` currently treats all `/api/**` routes as public.
- Route-level access control is enforced selectively in handlers.
- `GET /api/secure-api-route` demonstrates authenticated API access.

## Database and Assignment Model

- Complaint assignments are tracked in `complaint_assignments` (`ComplaintAssignment` model).
- Assignment history supports `outcome`, `relievedAt`, `deadline`, and `assignedBy`.
- Escalation job scans overdue assignments and reassigns complaints up officer hierarchy.

## Environment Variables

Required:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Optional or feature-specific:

- `CRON_SECRET` (required for protected cron trigger `POST /api/cron/escalate`)
- `GOOGLE_PLACE_API_KEY` (used by LangChain classifier model config)
- `REDIS_URL` (required to enable Redis cache and rate limiting)
- `REDIS_TOKEN` (required for Upstash REST auth)

## Redis (Caching + Rate Limiting)

This project supports Redis-powered caching and rate limiting in App Router route handlers.

- Recommended on Vercel: Upstash Redis (`@upstash/redis`), because it is serverless-friendly.
- Self-hosted Redis + `ioredis` can work, but Upstash is better aligned with Vercel serverless functions.

### Setup

1. Create an Upstash Redis database.
2. Add environment variables:
	 - `REDIS_URL`
	 - `REDIS_TOKEN`
3. Restart the app.

### Included implementation

- `lib/redis.ts` — Redis singleton (lazy init + graceful fallback)
- `lib/cache.ts` — Reusable cache get/set helpers
- `lib/rate-limit.ts` — Redis-backed rate limiter helper (`10 req/min` default)
- `lib/request-helpers.ts` — Client IP extraction and Redis key builder

### Working examples

- Caching example: `GET /api/dashboard/stats`
	- Cache key: `cache:dashboard:stats:v1`
	- TTL: 60 seconds
	- Response includes `meta.cache` as `"hit"` or `"miss"`

- Rate limiting example: `/api/upload`
	- `POST /api/upload`: 10 requests per 60 seconds
	- `DELETE /api/upload`: 20 requests per 60 seconds
	- On limit exceeded, returns `429` with `Retry-After` and `X-RateLimit-*` headers

- Additional Redis-enabled APIs:
	- `GET /api/complaint`: short TTL cache (20-30s depending on query) + read rate limit (60/min)
	- `POST /api/complaint`: write rate limit (12/min)
	- `GET /api/feedback`: short TTL cache (20s) + read rate limit (45/min)
	- `POST /api/feedback`: write rate limit (10/min)
	- `GET /api/notifications`: short TTL cache (15s) + read rate limit (60/min)

### Graceful degradation

If Redis is misconfigured or unavailable, the app does not crash:

- Cache helpers skip reads/writes and route continues normally.
- Rate limiter fails open (allows request) to preserve API availability.

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env`.

3. Ensure Prisma schema is pushed to your database:

```bash
npx prisma db push
```

4. Start development server:

```bash
npm run dev
```

5. Open:

- `http://localhost:3000` for citizen UI
- `http://localhost:3000/admin` for admin dashboard

## Available Scripts

- `npm run dev` start local dev server
- `npm run build` create production build
- `npm run start` start production server
- `npm run lint` run ESLint

## Current Gaps and Next Priorities

- Add role-based authorization across sensitive API routes.
- Expand automated test coverage (API and integration).
- Improve complaint resolve flow to consistently capture `resolvedById`.
- Clarify or refactor `GET /api/complaint/resolve/[id]` semantics (currently returns unresolved records).
- Complete business logic for `POST /api/agents`.

## Notes

- For full implementation context and architectural decisions, see `AGENT.md`.
