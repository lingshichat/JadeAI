# Frontend Development Guidelines

> Project-specific frontend conventions for JadeAI.

---

## Overview

JadeAI is a Next.js 16 App Router application with React 19, Tailwind CSS 4,
shadcn/ui, Zustand, next-intl, and Zod.

The documents in this directory describe the conventions that already exist in
the codebase so future AI sessions can match current patterns instead of
inventing new ones.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [AI Experience Guidelines](./ai-experience-guidelines.md) | Chat, specialist dialogs, session UX, AI interaction coordination | Customized |
| [Visual Design Guidelines](./visual-design-guidelines.md) | Current visual language, accent rules, motion, page-type coordination | Customized |
| [Directory Structure](./directory-structure.md) | Module organization and file layout | Customized |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | Customized |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | Customized |
| [State Management](./state-management.md) | Local state, global state, server state | Customized |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | Customized |
| [Type Safety](./type-safety.md) | Type patterns, validation | Customized |

---

## How to Use These Guidelines

1. Read this index before starting frontend work.
2. Open the specific guide that matches the change you are about to make.
3. If the work changes visible UI, also read `visual-design-guidelines.md`.
4. Follow the documented examples before introducing a new pattern.
5. Update these files when the project establishes a new convention.

---

**Language**: All documentation should be written in **English**.
