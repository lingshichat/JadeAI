# Directory Structure

> How frontend code is organized in this project.

---

## Overview

JadeAI uses a route-first Next.js App Router structure and keeps reusable UI
code outside `src/app/`.

The high-level rule is:

- Put routing, layouts, and route-level data boundaries in `src/app/`
- Put reusable React UI in `src/components/`
- Put cross-component client logic in `src/hooks/` or `src/stores/`
- Put shared domain types in `src/types/`
- Put framework-agnostic helpers, config, schemas, and integrations in `src/lib/`
- Put translation messages in top-level `messages/`

---

## Directory Layout

```
src/
├── app/                    # App Router pages, layouts, route handlers
│   ├── [locale]/           # Localized pages and layouts
│   └── api/                # Route handlers
├── components/
│   ├── ui/                 # shadcn/ui-style primitives
│   ├── landing/            # Marketing page sections
│   ├── dashboard/          # Resume dashboard UI
│   ├── editor/             # Resume editor UI
│   ├── preview/            # Preview renderer + templates
│   ├── ai/                 # AI chat and suggestion UI
│   ├── auth/               # Auth-related UI
│   ├── layout/             # Shared layout wrappers/providers
│   └── settings/           # Settings dialog UI
├── hooks/                  # Client hooks that wrap fetching or store orchestration
├── stores/                 # Zustand stores for shared client state
├── lib/                    # Utilities, config, DB/auth/AI integrations
├── types/                  # Shared domain interfaces and snapshots
├── i18n/                   # next-intl routing and request config
└── middleware.ts           # Locale/auth middleware
```

---

## Module Organization

- New routable screens start in `src/app/[locale]/...` and should stay thin.
  Route files usually compose existing components instead of holding large UI
  trees. See `src/app/[locale]/page.tsx` and `src/app/[locale]/dashboard/page.tsx`.
- Reusable feature UI lives under `src/components/<feature>/`.
  Examples:
  - `src/components/editor/`
  - `src/components/dashboard/`
  - `src/components/preview/`
- Shared primitives belong in `src/components/ui/`. Prefer extending these
  instead of re-creating buttons, inputs, dialogs, badges, and dropdowns.
- Shared client state belongs in `src/stores/` only when multiple components or
  panels need it. Examples include `editor-store.ts`, `resume-store.ts`,
  `settings-store.ts`, and `ui-store.ts`.
- Hook files in `src/hooks/` should encapsulate repeated client behavior such as
  CRUD flows, editor orchestration, auth, or AI chat setup.
- Domain types that are reused across features belong in `src/types/` instead
  of being duplicated inside components.
- When adding a new resume template, keep the preview template component in
  `src/components/preview/templates/` aligned with other template registries in
  the codebase.

---

## Naming Conventions

- Files and folders use kebab-case: `resume-card.tsx`, `editor-sidebar.tsx`,
  `theme-editor.tsx`.
- Components export PascalCase names from kebab-case files:
  `ResumeCard`, `EditorSidebar`, `LandingPage`.
- Hooks are named `use*` in both file and export name:
  `use-resume.ts`, `use-editor.ts`, `use-ai-chat.ts`.
- Zustand stores use the `*-store.ts` naming pattern:
  `resume-store.ts`, `editor-store.ts`, `settings-store.ts`.
- Shared types are grouped by domain:
  `types/resume.ts`, `types/editor.ts`, `types/auth.ts`, `types/ai.ts`.
- Route folders follow Next.js conventions, including dynamic segments and route
  groups such as `[locale]`, `[id]`, and `(auth)`.

---

## Examples

- `src/app/[locale]/dashboard/page.tsx`: route-level screen that wires together
  hooks, stores, and feature components.
- `src/components/editor/`: feature-oriented folder with `fields/`,
  `sections/`, and `dnd/` subdirectories.
- `src/components/preview/resume-preview.tsx`: shared feature entry point that
  registers many preview templates without pushing that logic into route files.
- `src/hooks/use-editor.ts`: hook that coordinates route data loading and store
  lifecycle.
- `src/stores/resume-store.ts`: shared domain store for editor data and autosave.
