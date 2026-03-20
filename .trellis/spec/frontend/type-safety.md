# Type Safety

> Type safety patterns in this project.

---

## Overview

The frontend is written in strict TypeScript (`"strict": true` in
`tsconfig.json`) and uses a mix of:

- Shared interfaces in `src/types/`
- `as const` arrays plus derived unions for controlled value sets
- Zod schemas for runtime validation at AI/API boundaries

Use shared types first. Only define local component prop types inline when the
shape is small and not reused elsewhere.

---

## Type Organization

- Shared domain models live in `src/types/`:
  `resume.ts`, `editor.ts`, `auth.ts`, `ai.ts`.
- Keep component-only prop interfaces in the component file.
- Keep runtime schemas close to the integration that needs them, such as the AI
  schemas in `src/lib/ai/`.
- Derive union types from constant arrays when the valid values are owned by the
  frontend. Example:
  `SectionType` and `Template` in `src/lib/constants.ts`.
- Use `Record<...>` for keyed registries where the key space is known, such as
  `templateMap` in `src/components/preview/resume-preview.tsx`.

---

## Validation

- Use Zod v4 for runtime validation of AI input/output and other untrusted
  payloads.
- Export both the schema and the inferred TypeScript type from the same module
  when possible.

Examples:

- `src/lib/ai/generate-resume-schema.ts`
- `src/lib/ai/grammar-check-schema.ts`
- `src/lib/ai/translate-schema.ts`

At API boundaries, validate first and then map the validated payload into the
shared frontend types.

---

## Common Patterns

- `z.infer<typeof schema>` for schema-backed types
- `as const` plus indexed access types for literal unions
- Explicit interfaces for store contracts and domain entities
- `Partial<T>` for patch-style update functions such as section content updates
- Converting serialized API values into richer frontend values after fetch, such
  as `Date` reconstruction in `useEditor`

Examples:

- `src/types/resume.ts`: domain interfaces
- `src/stores/resume-store.ts`: typed Zustand store contract
- `src/lib/constants.ts`: constant arrays and derived unions
- `src/lib/ai/generate-resume-schema.ts`: schema + inferred types

---

## Forbidden Patterns

- Avoid introducing new `any` types. There are a few existing escape hatches for
  third-party data, but new code should prefer real unions, generics, or schema
  validation.
- Avoid broad `as` assertions before validation.
- Do not duplicate shared models in component files when `@/types/...` already
  owns them.
- Do not use raw strings for section types or template names if a union already
  exists in `src/lib/constants.ts`.
- Do not assume API date strings are already `Date` objects on the client.
