# State Management

> How state is managed in this project.

---

## Overview

JadeAI uses three main state layers:

- Local component state for short-lived UI concerns
- Zustand stores for shared client state and persistence-sensitive flows
- Manual `fetch` calls for server state, followed by syncing into local state or stores

There is no React Query, SWR, Redux, or server-state cache library in the
current frontend.

---

## State Categories

- Local state:
  Use `useState`, `useMemo`, and `useEffect` for local-only UI behavior such as
  search input, sort mode, rename drafts, and view preferences.
  Examples:
  - `src/app/[locale]/dashboard/page.tsx`
  - `src/components/dashboard/resume-card.tsx`
- Shared UI state:
  Put cross-component UI state in Zustand stores. Examples include modal
  visibility and theme tab selection in `src/stores/ui-store.ts`, plus editor
  panel and undo/redo state in `src/stores/editor-store.ts`.
- Shared domain state:
  Keep loaded resume data and autosave behavior in `src/stores/resume-store.ts`.
- Settings and persistence state:
  Use `src/stores/settings-store.ts` for AI provider choices, autosave
  preferences, hydration flags, and local/server syncing.
- URL state:
  Use App Router params for locale and document ids, for example
  `src/app/[locale]/editor/[id]/page.tsx`.

---

## When to Use Global State

Promote state to Zustand only when at least one of these is true:

- Multiple sibling components need the same state
- State must survive interaction across panels or dialogs
- State owns cross-cutting behavior such as autosave, undo/redo, or tour progress
- State must hydrate from `localStorage` or sync to the server

Good fits in the current codebase:

- `resume-store.ts` for the current resume and section mutations
- `editor-store.ts` for editor-wide UI state
- `settings-store.ts` for persisted preferences
- `ui-store.ts` for modal and theme settings

Keep temporary form drafts and single-component filters local unless they truly
need to be shared.

---

## Server State

- Load server data explicitly with `fetch`.
- Put repeated CRUD logic in hooks such as `useResume` and `useEditor`.
- Convert API payloads into the shape expected by the frontend before storing
  them. Example: `useEditor` converts `createdAt` and `updatedAt` into `Date`
  objects.
- After local mutations, stores usually schedule a save or refresh manually
  instead of relying on a cache layer.
- For externally triggered server changes, use explicit reloads.
  `useAIChat` calls `reloadResume()` after tool outputs update the resume.
- Settings sync is debounced in `settings-store.ts` and keeps the API key local
  while syncing the non-secret settings fields to `/api/user/settings`.

---

## Common Mistakes

- Moving short-lived component state into Zustand too early.
- Forgetting to guard persisted stores with hydration flags such as `_hydrated`.
- Updating editor data without also handling autosave or undo/redo expectations.
- Forgetting to clear pending timers when replacing store-owned async behavior.
- Treating server data as already normalized when the frontend still needs to add
  ids or convert dates before using it.
