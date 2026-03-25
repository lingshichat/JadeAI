# AI Experience Guidelines

> How AI chat, specialist AI dialogs, and resume-writing interactions work together in JadeAI.

---

## Overview

JadeAI's AI frontend is not one component. It is a coordinated system made of:

- a persistent resume-bound chat surface
- specialist AI dialogs for focused workflows
- settings-driven model/provider configuration
- store-to-chat bridges that turn analysis results into actionable follow-up

When touching AI UI, do not design it like a separate mini-app. It should feel
like part of the editor and dashboard, with slightly stronger accent emphasis
but the same product language.

---

## Current AI Surface Model

### Core chat surface

The main conversational entry point is the floating chat bubble + chat window:

- `src/components/ai/ai-chat-bubble.tsx`
- `src/components/ai/ai-chat-panel.tsx`
- `src/components/ai/ai-message.tsx`
- `src/components/ai/ai-input.tsx`

This surface is:

- resume-scoped
- session-based
- model-aware
- tool-transparent
- always available from the editor

### Specialist AI surfaces

Focused workflows currently live in dedicated dialogs:

- JD analysis: `src/components/editor/jd-analysis-dialog.tsx`
- Grammar check: `src/components/editor/grammar-check-dialog.tsx`
- Translate: `src/components/editor/translate-dialog.tsx`
- Cover letter: `src/components/editor/cover-letter-dialog.tsx`
- Full resume generation: `src/components/dashboard/generate-resume-dialog.tsx`

These are not replacements for chat. They are structured accelerators for
specific tasks.

### Shared interaction principle

Use specialist dialogs when the task needs:

- structured input
- a focused result dashboard
- a higher-confidence workflow than free-form chat

Use chat when the task needs:

- iterative rewriting
- tool-driven resume edits
- follow-up prompts and refinement
- conversational control

---

## Resume-Bound AI Contract

Every AI interaction tied to editing must stay anchored to a specific resume.

Current frontend patterns:

- `AIChatContent` receives `resumeId`
- `useAIChat({ resumeId, sessionId, initialMessages, selectedModel })`
- specialist dialogs receive `resumeId`

Rules:

- do not create free-floating editor AI actions without an explicit `resumeId`
- do not let chat mutate a resume without staying inside that resume's context
- when switching chat sessions, keep the current resume scope stable

---

## Session UX Rules

Chat sessions are part of the product experience, not just backend persistence.

Current behavior:

- sessions are fetched on mount
- the most recent session auto-opens
- a new session is created automatically if none exist
- session history is shown in a popover
- the first user message renames the default new-session title

Rules for future work:

- session switching should feel instant and safe
- do not destroy chat state unnecessarily when toggling the chat window
- destructive actions like deleting a session should not break the active chat flow
- preserve message continuity and scroll expectations when loading history

Preferred direction:

- keep the chat shell mounted and toggle visibility rather than remounting the
  whole experience
- continue using explicit history UI, not hidden auto-threading

---

## Chat Message Presentation

### Message roles

Current message rendering distinguishes:

- user bubbles
- assistant bubbles
- tool call blocks
- local inline warning states such as missing API key

Files:

- `src/components/ai/ai-message.tsx`
- `src/components/ai/ai-suggestion.tsx`

Rules:

- assistant output should remain readable first, inspectable second
- tool activity should be visible but collapsible
- operational errors should be surfaced in product language, not raw provider dumps
- warnings that the user can immediately fix should prefer inline UI over a toast-only pattern

### Tool transparency

JadeAI currently exposes tool execution through collapsible blocks.

Keep this behavior when adding new tool-driven experiences:

- show what the AI is calling
- show whether the tool succeeded or failed
- keep the JSON/details secondary, not dominant

Do not hide all tool activity if the user-visible outcome depends on tool writes.

---

## Input and Model Selection

Current chat input behavior:

- `Enter` submits
- `Shift+Enter` keeps a multiline draft
- selected model is visible inline
- send button state reflects loading and empty input

Rules:

- keep the message composer compact and low-friction
- keep model selection adjacent to the input, not buried in a separate flow
- avoid adding extra controls that slow down everyday rewriting
- any new primary action around the composer must justify its screen cost

Settings and model configuration currently come from:

- `src/stores/settings-store.ts`
- `src/components/settings/settings-dialog.tsx`

Do not duplicate provider/model configuration UI inside feature-specific dialogs
unless the experience truly needs a local override.

---

## Bridge Pattern: Specialist Result -> Chat Follow-Up

One of JadeAI's most important current patterns is the bridge from specialist AI
workflows back into the main chat.

Current examples:

- JD analysis -> `setPendingAiMessage(...)` -> open AI chat
- Grammar check -> `setPendingAiMessage(...)` -> open AI chat

This bridge lives through:

- `src/stores/editor-store.ts`
- `pendingAiMessage`
- `AIChatContent` consuming and sending it once sessions are ready

Rules:

- when a specialist flow needs iterative follow-up, route users back into chat
  instead of duplicating another editing surface
- keep the bridge explicit and inspectable
- clear pending bridge state after it is consumed

Preferred direction for future work:

- structured analysis may start in a dialog
- actual iterative rewriting should usually continue in chat or a chat-adjacent
  review surface

---

## Specialist Dialog Rules

### JD analysis and grammar check

These dialogs currently act as result dashboards:

- show score/history
- show structured issues or suggestions
- offer a follow-up optimization action

Rules:

- keep results scannable and section-oriented
- favor clear action labels over generic "continue" wording
- preserve history when the result has longitudinal value

### Translate

Translate is a long-running operation with progress feedback and copy/overwrite
mode.

Rules:

- long-running AI work should show progress, not a frozen modal
- destructive choices like overwrite vs copy must stay explicit
- copy modes are preferable when the action creates a meaningful new resume

### Full resume generation

Generate-resume is a structured creation flow, not a chat substitute.

Rules:

- keep required inputs minimal but meaningful
- bias the UI toward "get to a usable first draft quickly"
- do not overload this flow with advanced controls better handled later in the editor

---

## Preferred Direction for New AI UX

Based on the current product direction, new AI work should move toward:

- more structured review before destructive edits
- stronger continuity between analysis and rewrite flows
- clearer resume-version awareness for JD-targeted work
- less fragmentation across AI entry points

That means:

- avoid spawning new isolated AI panels for every feature
- prefer extending the existing chat/dialog system
- prefer module-level review surfaces over raw text dumps
- keep the user in control of what gets applied to the resume

---

## Visual Coordination for AI Surfaces

AI surfaces may be slightly more expressive than dashboard or settings surfaces,
but they still belong to the same design system.

Follow `visual-design-guidelines.md` with these AI-specific notes:

- pink is the main AI emphasis color
- gradients are acceptable for assistant identity and CTA emphasis
- cards and shells still use the same radius and shadow family as the rest of the product
- keep AI panels readable and operational, not decorative

Good current references:

- `src/components/ai/ai-chat-bubble.tsx`
- `src/components/ai/ai-chat-panel.tsx`
- `src/components/ai/ai-suggestion.tsx`

Avoid:

- making AI surfaces feel like a different brand
- overusing gradients in dense result dashboards
- relying on color alone to communicate status

---

## Loading, Error, and Recovery Rules

Current AI UX already uses several layers of recovery:

- inline API-key-missing card
- toasts for provider/runtime failures
- spinners and loading states
- session recreation when the active session is deleted

Rules:

- do not leave async AI workflows without visible feedback
- use inline UI when the error is user-fixable in context
- use toasts for transient operational failures
- avoid silent failures, especially in editor-bound AI flows
- when a failure blocks resume edits, explain what the user can do next

---

## Hook and State Patterns

Current reusable AI frontend orchestration lives in:

- `use-ai-chat.ts`
- `use-message-pagination.ts`
- `settings-store.ts`
- `editor-store.ts`

Rules:

- keep transport/header logic in hooks or stores, not repeated in components
- preserve the `headers: () => ...` pattern for chat transport so hydrated AI
  config is not frozen early
- use explicit reloads when tool execution changes server state outside the
  normal local mutation path
- abort stale async work when switching sessions or contexts

Do not:

- duplicate chat transport creation in multiple components
- manually rebuild AI history state in route components
- bypass the existing pending message bridge for specialist-to-chat handoff

---

## Common Mistakes

- Treating specialist AI dialogs as separate products instead of part of one AI system
- Creating a new AI entry point when the existing chat or dialog flow would suffice
- Hiding tool writes so much that the user loses confidence in what changed
- Adding model/provider controls in multiple places
- Breaking session continuity when toggling or moving the AI window
- Building AI UI that ignores the resume context and version context
- Making AI surfaces visually louder than the task they are supposed to support

---

## Review Checklist

- Does this change fit the existing split between chat and specialist dialogs?
- Is the interaction clearly bound to a specific resume?
- If the flow produces follow-up edits, should it bridge back into chat?
- Are loading, error, and recovery states visible and actionable?
- Does the UI remain visually coordinated with the current AI and product surfaces?
- If a new suggestion/review surface is introduced, does it improve control rather than add fragmentation?
