# AI Backend Guidelines

> Executable contracts for JadeAI AI route handlers, provider setup, tool execution, and persistence.

---

## Overview

JadeAI's AI backend is built around Next.js Route Handlers in `src/app/api/ai/`
plus a shared provider/tool layer in `src/lib/ai/`.

These routes are not simple wrappers around a model API. They combine:

- per-request provider configuration from request headers
- authenticated resume access
- Zod input validation
- AI response parsing or streaming
- DB persistence for sessions and history
- optional MCP web tools for local chat web access

When touching any AI route, provider contract, or resume mutation tool, treat it
as cross-layer work. Do not rely on principle-only guidelines here; follow the
concrete signatures and error contracts below.

---

## 1. Scope / Trigger

Use this guide when a change touches any of:

- `src/app/api/ai/*`
- `src/lib/ai/provider.ts`
- `src/lib/ai/tools.ts`
- `src/lib/ai/*-schema.ts`
- `src/lib/db/repositories/chat.repository.ts`
- `src/lib/db/repositories/analysis.repository.ts`
- AI-specific request headers such as `x-provider`, `x-api-key`, or MCP headers

This guide is mandatory because AI changes here affect multiple layers at once:

- browser settings and request headers
- route validation and auth
- upstream AI provider calls
- DB history/session persistence
- editor-side resume mutation behavior

---

## 2. Signatures

### Route families

#### Chat

- `POST /api/ai/chat`
- `GET /api/ai/chat/sessions?resumeId=...`
- `POST /api/ai/chat/sessions`
- `GET /api/ai/chat/sessions/[sessionId]?cursor=...&limit=...`
- `DELETE /api/ai/chat/sessions/[sessionId]`

#### Analysis and generation

- `POST /api/ai/generate-resume`
- `POST /api/ai/grammar-check`
- `GET /api/ai/grammar-check/history?resumeId=...`
- `GET /api/ai/grammar-check/history?resumeId=...&id=...`
- `DELETE /api/ai/grammar-check/history?id=...`
- `POST /api/ai/jd-analysis`
- `GET /api/ai/jd-analysis/history?resumeId=...`
- `GET /api/ai/jd-analysis/history?resumeId=...&id=...`
- `DELETE /api/ai/jd-analysis/history?id=...`

#### Writing utilities

- `POST /api/ai/cover-letter`
- `POST /api/ai/translate`
- `GET /api/ai/models`

### Shared backend entry points

- `extractAIConfig(request)` in `src/lib/ai/provider.ts`
- `getModel(config, modelOverride?)` in `src/lib/ai/provider.ts`
- `getJsonProviderOptions(config)` in `src/lib/ai/provider.ts`
- `createExecutableTools(resumeId, aiConfig)` in `src/lib/ai/tools.ts`

### Persistence entry points

- `chatRepository.*` for sessions/messages
- `analysisRepository.*` for JD analysis and grammar history

---

## 3. Contracts

### 3.1 Request header contract

AI routes read provider configuration from request headers, not from server env:

- `x-provider`
- `x-api-key`
- `x-base-url`
- `x-model`

Chat may also receive local MCP config:

- `x-exa-pool-base-url`
- `x-exa-pool-api-key`

Rules:

- Missing `x-api-key` must fail through `AIConfigError` for routes that require
  a real model call.
- `x-provider` defaults to `openai`.
- `x-base-url` defaults to OpenAI's `/v1` endpoint for OpenAI-compatible flows.
- `x-model` defaults to `gpt-4o`.

### 3.2 Auth contract

Every AI route must:

1. call `getUserIdFromRequest(request)`
2. call `resolveUser(fingerprint)`
3. reject unauthenticated callers before accessing resume or history data

Do not call `auth()` directly inside AI route handlers.

### 3.3 Resume ownership contract

Any AI route that reads or mutates resume-derived data must verify ownership.

Minimum pattern:

```ts
const resume = await resumeRepository.findById(resumeId);
if (!resume) {
  return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
}
if (resume.userId !== user.id) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

For nested session/history resources, do not trust the `sessionId` or `id`
alone. Resolve the parent resume and verify it belongs to the current user.

### 3.4 Provider contract

`getModel()` currently supports:

- OpenAI-compatible providers via `createOpenAI(...)`
- Anthropic via `createAnthropic(...)`
- Gemini via `createGoogleGenerativeAI(...)`

Rules:

- OpenAI-compatible flows use `openAICompatibleFetch` to normalize certain
  malformed provider payloads into explicit error responses.
- JSON-mode provider options are only added for `openai`.
- New provider support must update `extractAIConfig()`, `getModel()`, and any
  model listing logic in `/api/ai/models`.

### 3.5 Chat contract

`POST /api/ai/chat` accepts a body with:

- `messages`
- `resumeId`
- `model`
- `sessionId`

Behavior:

1. authenticate user
2. optionally load `resume.sections` as JSON context
3. if `sessionId` exists, persist the latest user message before streaming
4. build provider config from headers
5. build resume mutation tools when `resumeId` exists
6. optionally attach MCP web tools
7. truncate model input to the last `MAX_MESSAGES` messages
8. stream the assistant response with `toUIMessageStreamResponse()`
9. on finish, persist assistant text plus ordered text/tool parts metadata

Operational constants currently in code:

- `MAX_ROUNDS = 10`
- `MAX_MESSAGES = 20`
- `stopWhen: stepCountIs(25)` when tools are enabled
- `runtime = 'nodejs'`

### 3.6 Tool execution contract

`createExecutableTools()` currently exposes these tools:

- `updateSection`
- `addSection`
- `rewriteText`
- `suggestSkills`
- `analyzeJdMatch`
- `translateResume`

Tool rules:

- `updateSection` accepts `value` as a string and attempts `JSON.parse` first
- list-like sections must normalize to `items` or `categories`
- missing item/category ids are auto-filled with `crypto.randomUUID()`
- GitHub items protect read-only fields and may auto-fetch metadata from GitHub
- tool execution mutates the persisted resume immediately

### 3.7 Analysis/history contract

JD analysis persists:

- `resumeId`
- `jobDescription`
- optional `targetJobTitle`
- optional `targetCompany`
- parsed `result`
- `overallScore`
- `atsScore`

Grammar check persists:

- `resumeId`
- parsed `result`
- `score`
- `issueCount`

History routes support:

- list access by `resumeId`
- detail access by `resumeId + id`
- delete access by `id`
- list payloads may also include JD-target snapshot fields for UI labeling

### 3.8 Translate contract

`POST /api/ai/translate` returns `application/x-ndjson`.

Input fields:

- `resumeId`
- `targetLanguage`
- optional `sectionIds`
- `mode: overwrite | copy`

Behavior:

- `copy` duplicates the resume before translation
- translation runs section-by-section with concurrency limit `4`
- heavy non-translatable fields such as `personal_info.avatar` are stripped
  before model calls and merged back after translation
- the final stream always ends with a `done` event

NDJSON event types currently emitted:

- `progress`
- `done`

### 3.9 Models route contract

`GET /api/ai/models` must never hard-fail the UI because provider lookup failed.

Current behavior:

- if no API key exists, return `{ models: [] }`
- if upstream fetch fails, return `{ models: [] }`
- OpenAI-compatible flows hit `/models`
- Anthropic hits `/v1/models`
- Gemini hits `/models?key=...`

### 3.10 Cover letter contract

`POST /api/ai/cover-letter` uses delimiter-based parsing, not JSON output.

Current expected output format:

```text
TITLE: <title>
---CONTENT---
<cover letter body>
```

Fallback parsing currently extracts title from the first line if the delimiter
is missing.

---

## 4. Validation & Error Matrix

| Boundary | Condition | Expected behavior |
|---|---|---|
| AI route auth | no resolved user | 401 before model/repository work |
| Resume-bound AI route | missing resume | 404 JSON error |
| Resume-bound AI route | resume belongs to another user | 401 or 403 depending on route pattern; prefer one convention per route family |
| Zod-validated route | invalid body | 400 JSON error with `details` |
| Provider config | missing API key | 401 with `AIConfigError` message |
| Chat MCP init | MCP client/tool init fails | log error, continue with resume tools only |
| JSON-parsed AI route | model returns non-parseable payload | 500 after `extractJson(...)` throws |
| Translate route | no matching sections | 400 JSON error |
| Translate route | some section translations fail | continue stream; emit `done` with `failedCount` |
| Models route | upstream model list fetch fails | return `{ models: [] }` |
| History detail route | parent resume not owned by user | 404 or 401 depending on existing route family |

Recommended stability rule for future work:

- Prefer JSON error responses for new AI routes.
- Do not introduce plain-text `new Response('Unauthorized')` style errors in
  new handlers unless the response must remain stream-compatible.

---

## 5. Good / Base / Bad Cases

### Good

- A chat request arrives with valid AI headers, a valid `resumeId`, and a
  persisted `sessionId`; user message is saved, assistant streams, and ordered
  tool/text parts are saved on finish.
- A translate request in `copy` mode duplicates the resume, emits progress
  events, and finishes with a `done` event containing `newResumeId`.
- A JD analysis request validates `resumeId` and `jobDescription`, persists the
  result, and returns `{ ...analysisData, historyId }`.

### Base

- `/api/ai/models` receives a valid provider but no API key and returns
  `{ models: [] }`.
- Grammar check is scoped to a subset of sections via `sectionIds`.
- Chat runs without MCP web tools because Exa Pool headers are absent.

### Bad

- A route trusts `sessionId` or history `id` without verifying that the parent
  resume belongs to the current user.
- A new AI route bypasses Zod validation for a non-trivial payload.
- A tool mutation path writes nested `{ items: { items: [...] } }` structures
  back into section content without normalization.
- A route adds a new provider header or output field without updating the shared
  contract in `provider.ts` and the relevant frontend caller.

---

## 6. Tests Required

When changing AI backend code, cover the changed area with at least these checks:

- Auth:
  - unauthenticated request returns 401
  - another user cannot access someone else's resume/history/session
- Validation:
  - invalid payload returns 400
  - required query params are enforced
- Persistence:
  - history/session rows are created or updated as expected
  - title/session metadata updates happen only when intended
- Streaming:
  - chat still returns a UI message stream
  - translate still returns NDJSON with a terminal `done` event
- Provider config:
  - missing API key returns `AIConfigError` path
  - model listing gracefully degrades to `{ models: [] }`
- Tool behavior:
  - list-like section updates normalize ids and field names
  - GitHub read-only fields are preserved

Manual assertion points are still required even if automated tests are absent:

- chat can mutate a resume and the editor reload path still works
- JD analysis / grammar history list and detail flows still match route output
- translate `copy` mode produces a usable new resume

---

## 7. Wrong vs Correct

### Wrong

```ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const user = await resolveUser(getUserIdFromRequest(request));
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { sessionId } = await params;
  await chatRepository.deleteSession(sessionId);
  return NextResponse.json({ success: true });
}
```

Why it is wrong:

- deletes by `sessionId` without proving the session belongs to the current user
- copies a plain-text error style that makes API behavior inconsistent

### Correct

```ts
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const fingerprint = getUserIdFromRequest(request);
  const user = await resolveUser(fingerprint);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { sessionId } = await params;
  const session = await chatRepository.findSession(sessionId);
  if (!session) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const resume = await resumeRepository.findById(session.resumeId);
  if (!resume || resume.userId !== user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await chatRepository.deleteSession(sessionId);
  return NextResponse.json({ success: true });
}
```

### Wrong

```ts
const body = await request.json();
const { resumeId, targetLanguage } = body;
```

Why it is wrong:

- no runtime validation
- no clear 400 error path
- schema drift becomes invisible

### Correct

```ts
const body = await request.json();
const parsed = translateInputSchema.safeParse(body);
if (!parsed.success) {
  return new Response(
    JSON.stringify({ error: 'Invalid input', details: parsed.error.issues }),
    { status: 400 }
  );
}

const { resumeId, targetLanguage, sectionIds, mode } = parsed.data;
```

---

## Common Mistakes

- Treating AI routes as pure provider wrappers instead of auth + persistence + provider flows
- Forgetting that provider config comes from headers, not server env
- Skipping parent resume ownership checks for sessions or history rows
- Returning a new response shape without updating the paired frontend flow
- Adding a new tool or provider field without documenting the request contract
- Forgetting to keep streaming routes (`chat`, `translate`) compatible with their UI consumers
