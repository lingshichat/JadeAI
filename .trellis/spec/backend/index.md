# Backend Development Guidelines

> Project-specific backend conventions for JadeAI.

---

## Overview

JadeAI is a Next.js 16 App Router application with a Node.js backend layer
implemented as Next.js Route Handlers (`src/app/api/`). The backend handles:

- Resume CRUD and persistence (SQLite via Drizzle ORM, PostgreSQL via separate
  migrations)
- AI feature orchestration (resume generation, grammar check, JD analysis,
  translation, chat, cover letter)
- Authentication via NextAuth.js (Google OAuth + Fingerprint/anonymous mode)
- Export to PDF, HTML, TXT, DOCX, and JSON
- Share link management with optional password protection
- LinkedIn profile photo generation

The documents in this directory describe conventions already present in the
codebase so future AI sessions can match existing patterns instead of inventing
new ones.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [AI Backend Guidelines](./ai-guidelines.md) | AI route contracts, provider headers, tools, streaming, persistence | Customized |
| [API Guidelines](./api-guidelines.md) | Route handler patterns, request validation, error handling | Customized |
| [Database Guidelines](./database-guidelines.md) | Drizzle schema, repository pattern, migrations | Customized |
| [Auth Guidelines](./auth-guidelines.md) | NextAuth config, fingerprint auth, middleware | Customized |

---

## How to Use These Guidelines

1. Read this index before starting backend work.
2. Open the specific guide that matches the change you are about to make.
3. Follow the documented examples before introducing a new pattern.
4. Update these files when the project establishes a new convention.

---

**Language**: All documentation should be written in **English**.
