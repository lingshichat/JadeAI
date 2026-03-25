# Visual Design Guidelines

> How JadeAI's current visual language stays coordinated across landing pages, productivity screens, and AI surfaces.

---

## Overview

JadeAI's current UI is best described as:

- editorial-neutral productivity UI at the core
- accent-led AI/product emphasis
- feature-rich marketing presentation with restrained motion

The codebase already shows a consistent pattern:

- neutral zinc/white surfaces for the default shell
- pink/rose as the only strong accent family
- large but controlled radii (`rounded-xl` / `rounded-2xl`)
- soft shadows and subtle lift on interactive cards
- small, responsive micro-interactions instead of heavy animation systems

This guide exists to prevent future pages from drifting into a different visual
language.

---

## Current Design Direction

### Product posture

- Core product screens should feel professional, calm, and efficient.
- AI-related entry points may feel slightly more expressive, but they still sit
  inside the same product system.
- Marketing surfaces may be more atmospheric than dashboard/editor surfaces, but
  they must still look like the same product.

### Design system summary

From current implementation and design-system analysis, the closest matching
direction is:

- **Pattern**: interactive demo + feature-rich
- **Style**: micro-interactions
- **Color posture**: editorial black + accent pink
- **Product mood**: professional, approachable, modern, AI-assisted

---

## Color Rules

### Base palette

The base UI uses neutral surfaces:

- background: white / near-white / zinc dark surfaces
- text: zinc/black
- borders: zinc-100 to zinc-300 in light mode, zinc-700 family in dark mode
- cards: white or subdued dark-card surfaces

Examples:

- `src/app/globals.css`
- `src/components/dashboard/resume-card.tsx`
- `src/components/settings/settings-dialog.tsx`

### Accent palette

Pink is the primary accent family across the product:

- primary CTA buttons
- selected states
- AI-specific emphasis
- feature highlights
- progress or suggestion emphasis

Use rose only as a supporting partner to pink, typically in gradients.

Good current patterns:

- `bg-pink-500 hover:bg-pink-600`
- `border-pink-200 bg-pink-50`
- `bg-gradient-to-r from-pink-500 to-rose-500`

Do:

- keep pink as the single dominant accent family
- use neutral zinc tones for the rest of the hierarchy
- reserve gradients for hero/AI/CTA emphasis, not every component

Don't:

- introduce additional unrelated brand accents per feature
- mix blue, purple, green, and pink as competing primary accents
- make standard dashboard surfaces look like marketing banners

---

## Typography Rules

### Current foundation

The current app typography is driven by shared font tokens in
`src/app/globals.css`, where `--font-sans` maps to the app's existing font
setup.

Rules:

- stay on the shared app font tokens for normal product work
- keep headings bold and compact
- keep body copy neutral, readable, and low-drama
- use size/weight/spacing for emphasis before introducing new type families

### Coordination principle

JadeAI currently behaves like a product-first UI, not a fashion/editorial site.
That means:

- dashboard/editor/dialogs should remain sans-led and highly legible
- marketing pages can use more expressive scale, but should not introduce a
  one-off font stack that breaks app continuity

Do:

- prefer typography contrast through scale and weight
- keep form/dialog copy compact and operational
- use gradient text sparingly, mainly in large landing hero moments

Don't:

- add one-off font families inside individual pages or components
- use decorative display typography in dashboard/editor surfaces
- overuse gradient text in dense product UIs

---

## Surface, Radius, and Depth

### Radius

The current product language leans toward soft rectangles:

- standard product cards: `rounded-xl`
- floating or emphasized shells: `rounded-2xl`
- compact pills/badges: rounded-full or small rounded tokens

Avoid mixing sharp, brutalist blocks with the current soft product language.

### Shadows

Shadows are soft and supportive, not dramatic.

Current good patterns:

- card hover lift with subtle shadow increase
- floating AI window shadow
- hero template thumbnails with softened large shadows

Do:

- use shadow to signal depth or hover
- keep resting shadows subtle
- combine shadow with small translate transforms for interactivity

Don't:

- stack multiple heavy shadows on routine UI
- use dramatic glow on ordinary product components
- rely on shadow alone to signal selection when border/background can help

---

## Motion Rules

### Current motion posture

JadeAI already uses motion in three categories:

- hover lift / feedback on interactive controls
- loading indicators and progress feedback
- decorative landing demos

### Product rules

- use 150ms to 300ms micro-interactions for most UI transitions
- prefer transform/opacity-based animation
- infinite animation belongs to loaders and carefully chosen marketing demos,
  not routine dashboard chrome
- respect reduced-motion preferences when adding new animation-heavy effects

Good current direction:

- button/card lift on hover
- spinner during async operations
- isolated landing-page demo animations

Avoid:

- decorative infinite motion in editor/dashboard surfaces
- layout-shifting hover effects
- long, sluggish transitions over 500ms for normal UI

---

## Page-Type Coordination

### Landing pages

Landing pages may be more expressive:

- radial pink glows
- gradient headline treatment
- floating template previews
- richer visual storytelling

Examples:

- `src/components/landing/hero-section.tsx`
- `src/components/landing/features-section.tsx`
- `src/components/landing/cta-section.tsx`

### Productivity screens

Dashboard, editor, preview, settings, dialogs, and management flows should stay
more restrained:

- neutral backgrounds
- clear information hierarchy
- accent pink only where it carries meaning
- card-driven layout and strong operational clarity

Examples:

- `src/app/[locale]/dashboard/page.tsx`
- `src/components/dashboard/resume-card.tsx`
- `src/components/settings/settings-dialog.tsx`

### AI surfaces

AI surfaces can sit between the two:

- slightly stronger accent presence
- gradient usage is acceptable for assistant identity
- suggestion states may use pink-tinted backgrounds
- still must remain readable and operational

Examples:

- `src/components/ai/ai-chat-bubble.tsx`
- `src/components/ai/ai-chat-panel.tsx`
- `src/components/ai/ai-suggestion.tsx`

---

## Component Coordination Rules

When adding new frontend work:

- match the page type you are working within
- reuse the same accent hierarchy already present on that surface
- prefer existing button/card/dialog language before inventing a new one
- keep badges, chips, and selected states visually compatible with current pink
  accent usage
- treat AI, editor, dashboard, and landing as one family with different
  intensity levels, not different brands

If you need a new visual pattern:

1. check whether an existing component already expresses it
2. match its radius, border, spacing, and motion style
3. only then extract or extend the pattern

---

## Common Mistakes

- Turning a product page into a marketing page with too many gradients and glows
- Introducing a second accent color family for a new feature
- Mixing radically different radii or card treatments on the same screen
- Using decorative animation in dense productivity workflows
- Adding a one-off font family to a single page
- Making AI UI feel like a separate product instead of a coordinated subsystem

---

## Review Checklist

- Does the surface stay within the right page-type intensity level?
- Is pink still the primary accent, with neutrals doing most of the work?
- Are radius, border, and shadow choices compatible with nearby components?
- Are hover and motion patterns subtle and performant?
- If gradients are used, are they reserved for hero/AI/CTA emphasis?
- Would this screen still feel like JadeAI if shown next to the dashboard and landing page?
