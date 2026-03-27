# Vapi Integration Guide (PS-CRM)

This document explains the Vapi AI voice assistant integration implemented in this repository.

## Overview

The project includes a real-time voice assistant UI in the client and a server route for tool-call execution using Vapi.

- Client component: `components/crm/VapiButton.tsx`
- Navbar usage: `components/layout/Navbar.tsx`
- Server tool endpoint: `app/api/agents/route.ts`
- Dependecy: `@vapi-ai/web` (see `package.json`)

## Environment Setup

Add these keys to `.env` or `.env.local`:

```env
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_public_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_assistant_id
```

Then restart the Next.js server (`npm run dev`) so keys are loaded.

## Client flow (`VapiButton`)

1. `VapiButton` is rendered in `Navbar`.
2. On first mount, it does `import('@vapi-ai/web')` dynamically and creates `new Vapi(pubKey)`.
3. It sets up listeners:
   - `call-start` → show chat + system connected message
   - `call-end` → show disconnected message
   - `message` → appends transcript or tool call notice
   - `error` → logs and message
4. `toggleCall` checks keys and toggles between start and stop.
5. `vapiRef.current.start(astId)` starts voice assistant call.
6. The UI renders floating transcript chat and button state.

## Server flow (`app/api/agents/route.ts`)

1. Vapi backend hits this route with a POST payload.
2. If payload has `message.type === 'tool-calls'`, the handler iterates `toolWithToolCallList`.
3. Parse tool name and args, executes:
   - `checkComplaintStatus`: lookup complaint in Prisma DB and respond
   - `createComplaint`: stub response
   - other tools: not implemented fallback
4. Returns `{ results: [ ... ] }` to Vapi.

## Extending functionality

- Add more functions in `app/api/agents/route.ts` to support voice actions (`assignComplaint`, `resolveComplaint`, etc.)
- Add local validation for argument structure
- Improve client message rendering and error handling

## Testing

- Manual: Verify voice button in UI, start call, speak, and see transcript/status.
- API: POST sample payload to `/api/agents` with `tool-calls` and validate JSON response.

## Notes

- Vapi uses `NEXT_PUBLIC_` env variables (exposed to browser).
- Always restart dev server after env changes.
- Keep API keys secure in production.
