# Component Guidelines

> How components are built in this project.

---

## Overview

Components in JadeAI are primarily function components with explicit prop types,
Tailwind-first styling, and named exports.

Use server components by default in `src/app/`. Add `'use client';` only when a
component needs hooks, browser APIs, local state, drag-and-drop, or event-heavy
interaction.

---

## Component Structure

Typical component files follow this shape:

1. Add `'use client';` only when required.
2. Import framework/library modules and then internal modules from `@/...`.
3. Define prop interfaces or inline prop types near the component.
4. Keep small helpers and constant maps in the same file when they are local to
   that component.
5. Export a named function component.

Patterns to copy:

- `src/components/dashboard/resume-card.tsx`: local helper callbacks, explicit
  props, and controlled event propagation.
- `src/components/editor/editor-sidebar.tsx`: file-local constants plus an
  internal subcomponent (`SortableSidebarItem`) when the logic is only reused in
  one parent file.
- `src/components/preview/resume-preview.tsx`: large feature entry point that
  keeps registry data outside the render path.

---

## Props Conventions

- Use explicit prop interfaces for reusable components:
  `ResumeCardProps`, `EditorSidebarProps`, `ResumePreviewProps`.
- Reuse shared domain types from `@/types/...` instead of rewriting shapes in
  each component.
- Prefer callback props that describe intent with `on*` names:
  `onDelete`, `onDuplicate`, `onRename`, `onUpdate`, `onOpenChange`.
- Prefer controlled dialog APIs that mirror Radix/shadcn patterns:
  `open={...}` with `onOpenChange={(open) => ...}`.
- When the prop surface is tiny and local, an inline object type is acceptable,
  as used by route files such as `src/app/[locale]/editor/[id]/page.tsx`.

---

## Styling Patterns

- Styling is Tailwind-first. Most components use utility classes inline.
- Reuse shadcn/ui primitives from `src/components/ui/` for common controls.
- Use `cn` from `@/lib/utils` for conditional class composition.
- Use `class-variance-authority` for reusable variant systems in shared UI
  primitives such as `src/components/ui/button.tsx`.
- Keep global CSS limited to app-wide tokens, shared markdown styles, and named
  animations in `src/app/globals.css`.
- Use CSS variables and theme-aware classes for light/dark support instead of
  duplicating separate component stylesheets.
- Keep visible UI aligned with `visual-design-guidelines.md`, especially for
  accent usage, radius, shadow, and motion intensity.

Examples:

- `src/components/ui/button.tsx`: `cva` + `cn` for shared variants.
- `src/components/dashboard/resume-card.tsx`: component-level Tailwind classes
  with conditional interaction styling.
- `src/app/globals.css`: shared tokens, animation helpers, and AI markdown rules.

### Visual Coordination

- Product surfaces such as dashboard, editor, dialogs, and settings should stay
  restrained and zinc-led.
- Pink is the primary accent family for CTA, selection, and AI emphasis.
- Landing sections may be more atmospheric, but should still feel like the same
  product family.
- AI surfaces may be slightly more expressive than dashboard surfaces, but they
  should not introduce a separate brand language.

Before inventing a new component treatment, check whether an adjacent feature
already uses a compatible card, badge, button, or panel pattern.

---

## Accessibility

- Use semantic controls such as `<button>`, `<input>`, and Radix-based menu or
  dialog primitives whenever possible.
- Always set `type="button"` on non-submit buttons inside interactive forms or
  toolbars.
- Pair visible field labels with inputs. Shared field components such as
  `EditableText` make this easy to keep consistent.
- Provide `alt` text for content images. Example:
  `src/components/editor/sections/personal-info.tsx`.
- Prefer shadcn/Radix primitives for focus management, keyboard navigation, and
  aria handling.
- If a whole card is clickable, make nested actions stop propagation carefully.
  `src/components/dashboard/resume-card.tsx` is the pattern to copy when this is
  unavoidable.

Preferred direction for new code:

- Use semantic links or buttons instead of plain clickable `div` containers when
  you can.

---

## Common Mistakes

- Forgetting `'use client';` on components that call hooks, access `window`, or
  use drag-and-drop libraries.
- Rebuilding a primitive instead of extending `src/components/ui/`.
- Duplicating domain types in component props instead of importing from
  `@/types/resume`.
- Creating nested click targets without `stopPropagation`, which breaks menus,
  rename inputs, or card navigation.
- Putting heavy data-fetching logic into presentational leaf components instead
  of a route component, hook, or store.
- Introducing a new accent color, radius system, or motion style that breaks
  coordination with existing dashboard/editor/AI surfaces.
