# API Guidelines

> How route handlers are built in this project.

---

## Overview

Route handlers live under `src/app/api/` and follow Next.js App Router
conventions. Every handler is a TypeScript file exporting one or more HTTP
method functions (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). Route segments use
bracket notation (`[id]`, `[sessionId]`) for dynamic parameters.

All protected routes require user authentication. Public routes (e.g.,
share token resolution) handle auth internally.

---

## Route Organization

```
src/app/api/
├── ai/
│   ├── chat/                    # AI chat streaming
│   │   ├── route.ts             # POST /api/ai/chat
│   │   └── sessions/
│   │       ├── route.ts         # GET/POST /api/ai/chat/sessions
│   │       └── [sessionId]/
│   │           └── route.ts     # GET/DELETE /api/ai/chat/sessions/:id
│   ├── cover-letter/
│   │   └── route.ts             # POST /api/ai/cover-letter
│   ├── generate-resume/
│   │   └── route.ts             # POST /api/ai/generate-resume
│   ├── grammar-check/
│   │   ├── route.ts             # POST /api/ai/grammar-check
│   │   └── history/
│   │       └── route.ts         # GET/DELETE /api/ai/grammar-check/history
│   ├── jd-analysis/
│   │   ├── route.ts             # POST /api/ai/jd-analysis
│   │   └── history/
│   │       └── route.ts         # GET/DELETE /api/ai/jd-analysis/history
│   ├── models/
│   │   └── route.ts             # GET /api/ai/models
│   └── translate/
│       └── route.ts             # POST /api/ai/translate
├── auth/
│   └── [...nextauth]/
│       └── route.ts             # NextAuth GET/POST handler
├── github/
│   └── repo/
│       └── route.ts             # GET /api/github/repo
├── linkedin-photo/
│   └── route.ts                 # POST /api/linkedin-photo
├── resume/
│   ├── route.ts                 # GET/POST /api/resume
│   ├── parse/
│   │   └── route.ts             # POST /api/resume/parse
│   └── [id]/
│       ├── route.ts             # GET/PUT/DELETE /api/resume/:id
│       ├── duplicate/
│       │   └── route.ts         # POST /api/resume/:id/duplicate
│       ├── export/
│       │   ├── route.ts         # GET /api/resume/:id/export
│       │   ├── builders.ts      # HTML generation helpers
│       │   ├── docx.ts          # DOCX generation
│       │   ├── plain-text.ts    # Plain text generation
│       │   ├── utils.ts         # Shared export utilities
│       │   └── templates/        # Per-template builders
│       ├── share/
│       │   └── route.ts         # GET/POST/DELETE /api/resume/:id/share
│       └── shares/
│           ├── route.ts         # GET/POST /api/resume/:id/shares
│           └── [shareId]/
│               └── route.ts     # PATCH/DELETE /api/resume/:id/shares/:shareId
├── share/
│   └── [token]/
│       └── route.ts             # GET /api/share/:token (public)
└── user/
    ├── route.ts                 # GET /api/user
    └── settings/
        └── route.ts             # GET/PUT /api/user/settings
```

---

## Handler Structure

A typical protected route handler follows this shape:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { resumeRepository } from '@/lib/db/repositories/resume.repository';
import { resolveUser, getUserIdFromRequest } from '@/lib/auth/helpers';

export async function GET(request: NextRequest) {
  try {
    const fingerprint = getUserIdFromRequest(request);
    const user = await resolveUser(fingerprint);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resumes = await resumeRepository.findAllByUserId(user.id);
    return NextResponse.json(resumes);
  } catch (error) {
    console.error('GET /api/resume error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

Patterns to copy:

- `src/app/api/resume/route.ts`: simple GET/POST with auth guard
- `src/app/api/resume/[id]/route.ts`: dynamic segment, ownership check, CRUD
- `src/app/api/resume/[id]/duplicate/route.ts`: ownership check plus optional
  validated body for JD-targeted resume copies
- `src/app/api/resume/[id]/export/route.ts`: multi-format export with query param routing

---

## Authentication Pattern

Every protected route MUST start with an auth check. Use the two helpers from
`@/lib/auth/helpers`:

- `getUserIdFromRequest(request)` — reads the `x-fingerprint` header only
- `resolveUser(fingerprint?)` — returns a full `User` DB record or `null`

```typescript
const fingerprint = getUserIdFromRequest(request);
const user = await resolveUser(fingerprint);
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

Do not call `auth()` directly in route handlers. Use the helper functions
instead.

> **Warning**: `getUserIdFromRequest()` does not read the NextAuth session
> cookie. In OAuth mode it usually returns `null`, and `resolveUser()` performs
> the session lookup internally via `auth()`.

---

## Ownership Verification

After resolving the user, always verify the resource belongs to them:

```typescript
const resume = await resumeRepository.findById(id);
if (!resume) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
if (resume.userId !== user.id) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

This pattern appears in every `/api/resume/[id]/*` route.

---

## Request Validation

Use Zod schemas to validate request bodies when the payload shape is reusable or
security-sensitive. Define schemas in `src/lib/ai/*-schema.ts` or inline with
`zod/v4`. Always call `safeParse` and return a 400 with details on failure:

```typescript
const parsed = someInputSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: 'Invalid input', details: parsed.error.issues },
    { status: 400 }
  );
}
```

Examples with real schemas:

- `src/lib/ai/generate-resume-schema.ts` — `generateResumeInputSchema`
- `src/lib/ai/grammar-check-schema.ts` — `grammarCheckInputSchema`
- `src/lib/ai/translate-schema.ts` — `translateInputSchema`

For simpler non-AI routes, the codebase also uses lightweight parsing via
`await request.json().catch(() => ({}))` plus explicit field checks. If you
follow that pattern, keep the allowed fields narrow and return the same
400/401/404/500 shapes as the rest of the API layer.

Example: `POST /api/resume/:id/duplicate` accepts an optional JSON body with
`title`, `targetJobTitle`, and `targetCompany`. `targetCompany` must not be
accepted without `targetJobTitle`.

---

## AI Route Conventions

AI routes (`/api/ai/*`) follow additional conventions:

### Input validation

Every AI route validates input with Zod before calling the AI provider.

### Error classification

AI routes distinguish between configuration errors and runtime errors:

```typescript
if (error instanceof AIConfigError) {
  return NextResponse.json({ error: error.message }, { status: 401 });
}
console.error('POST /api/ai/grammar-check error:', error);
return NextResponse.json({ error: 'Failed to check grammar' }, { status: 500 });
```

### Streaming responses

Chat routes return a streaming response using `result.toUIMessageStreamResponse()`
from the `ai` SDK. Other AI routes that do not stream return `NextResponse.json`.

### History routes

Analysis history routes use query params for both collection and detail access:

- `GET /api/ai/grammar-check/history?resumeId=...`
- `GET /api/ai/grammar-check/history?resumeId=...&id=...`
- `DELETE /api/ai/grammar-check/history?id=...`
- `GET /api/ai/jd-analysis/history?resumeId=...`
- `GET /api/ai/jd-analysis/history?resumeId=...&id=...`
- `DELETE /api/ai/jd-analysis/history?id=...`

These handlers verify resume ownership before returning list/detail data and use
the record id for deletion.

### System prompts

System prompts are defined inline or in `src/lib/ai/prompts.ts`. AI routes always
specify `maxOutputTokens` explicitly.

---

## Error Response Format

Use consistent JSON error shapes:

```json
{ "error": "Human-readable message" }
{ "error": "Invalid input", "details": [...] }
```

Avoid mixing 200 with an error field. Return the appropriate HTTP status code.

---

## Query Parameters

Read query params from `request.nextUrl.searchParams`:

```typescript
const format = request.nextUrl.searchParams.get('format') || 'json';
const fitOnePage = request.nextUrl.searchParams.get('fitOnePage') === 'true';
```

Patterns currently used in the codebase:

- format/export flags: `src/app/api/resume/[id]/export/route.ts`
- history list/detail branching:
  `src/app/api/ai/grammar-check/history/route.ts`
  `src/app/api/ai/jd-analysis/history/route.ts`
- public token lookup: `src/app/api/share/[token]/route.ts`

---

## Long-Running Operations

For serverless functions that need more time (e.g., PDF generation), export
`maxDuration`:

```typescript
// Chromium download + PDF render needs more time on Vercel serverless
export const maxDuration = 60;
```

See `src/app/api/resume/[id]/export/route.ts`.

---

## Common Mistakes

- Calling `auth()` directly instead of `resolveUser()` / `getUserIdFromRequest()`
- Skipping the ownership check on `resume.userId !== user.id`
- Using `request.json()` without a try/catch (it can throw on malformed bodies)
- Returning 200 with an error field instead of a proper 4xx/5xx status
- Using `any` for typed Zod-parsed data instead of the inferred type
- Documenting partial-update routes as `PUT` when the implementation actually
  uses `PATCH`, such as `src/app/api/resume/[id]/shares/[shareId]/route.ts`
- Forgetting to call `await` on async repository methods
- Not handling the case where `findById` returns `null` before accessing `.userId`
