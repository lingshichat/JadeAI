# brainstorm: folk 二开仓库梳理与 README 重写

## Goal

Reposition this repository as a derivative version maintained by our team,
clarify how it differs from the upstream JadeAI project, and rewrite the README
so it is accurate for our usage, deployment, and branding strategy. The task
also needs an explicit naming decision: keep the upstream name, adopt a new
product name, or use a transitional fork-style name.

## What I already know

* The repository currently presents itself externally as `JadeAI`.
* The selected new public-facing name is `RoleRover`.
* `package.json` uses `"name": "jadeai"`.
* The app brand is hardcoded in multiple places:
  `src/lib/constants.ts`, `src/app/layout.tsx`, `messages/en.json`,
  `messages/zh.json`, `.env.example`, `scripts/dev-local.mjs`,
  `src/components/landing/landing-header.tsx`, share pages, auth pages, seed
  data, and sample project URLs.
* The current README files (`README.md`, `README.zh-CN.md`) are written from
  the upstream project's point of view, including upstream Docker image,
  upstream GitHub repo, star-history links, community QR code sections, and
  product copy such as "Join thousands of job seekers..."
* The repository root includes a standard `LICENSE` file with Apache License
  2.0 text.
* There is no root `NOTICE` file in the current repository.
* Git remote currently points to `https://github.com/lingshichat/JadeAI.git`,
  so the hosting owner has already changed while the product/repo name remains
  `JadeAI`.

## Assumptions (temporary)

* We want the README to reflect our actual deployment and collaboration model,
  not simply mirror the upstream promotional copy.
* We want to remain compliant with Apache 2.0 while making it obvious this is a
  maintained derivative/fork.
* We may not want to rename every in-app string immediately if that creates too
  much churn; a staged rename may be preferable.

## Open Questions

* None for the current rename/documentation phase.

## Requirements (evolving)

* Audit the current repository branding and external-facing metadata.
* Rewrite the README content so it matches our forked/derivative positioning.
* Clarify the upstream relationship and license status in the documentation.
* Use a transitional fork-branding strategy while migrating the highest-value
  technical identifiers to `RoleRover`.
* Keep the scope focused on repository positioning, README, and brand strategy
  for the derivative version.

## Acceptance Criteria (evolving)

* [x] README positioning is rewritten from "original project" perspective to
      "our maintained derivative/fork" perspective.
* [x] License handling and attribution expectations are explicitly clarified.
* [x] Transitional naming strategy is selected with clear consequences and next
      actions.
* [x] The task documents which files would be affected by a full rename versus a
      README-only refresh.

## Definition of Done (team quality bar)

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Rollout/rollback considered if risky

## Out of Scope (explicit)

* Large-scale product feature changes unrelated to repo positioning
* Full legal review beyond practical Apache 2.0 attribution / naming concerns
* Immediate exhaustive rebrand of every code path before naming is agreed

## Technical Notes

* Repo root files inspected: `README.md`, `README.zh-CN.md`, `package.json`,
  `LICENSE`, `.env.example`
* Trellis context inspected: `.trellis/workflow.md`,
  `.trellis/spec/frontend/index.md`, `.trellis/spec/backend/index.md`
* Key branding touchpoints inspected:
  `src/lib/constants.ts`, `src/app/layout.tsx`,
  `src/components/landing/landing-header.tsx`, `messages/zh.json`
* Representative upstream-facing references found:
  Docker image `twwch/jadeai`, GitHub repo `twwch/JadeAI`, star-history link,
  app name `JadeAI`, sample copy and share-page copy
* Implemented transition updates:
  `README.md`, `README.zh-CN.md`, `NOTICE`, `public/logo.svg`,
  `package.json`, `.env.example`, `.env`, `compose.yml`,
  `docker_run_local.sh`, `scripts/dev-local.mjs`,
  `src/lib/ai/mcp/exa-pool-server.ts`, `src/lib/ai/exa-pool.ts`,
  `src/lib/constants.ts`, `src/app/layout.tsx`, landing/auth/share UI files,
  i18n messages, and sample seed branding
* Remaining intentional `JadeAI` references:
  upstream attribution, current GitHub repo path (`lingshichat/JadeAI`), and
  compatibility fallback for `JADEAI_SKIP_START`
* Quick web search notes:
  `Rover Resume` already appears as a LaTeX resume template name on Overleaf and
  GitHub (`subidit/rover-resume`), so the phrase is not unique even if it does
  not obviously collide with a major resume SaaS brand.

## Research Notes

### Constraints from Apache 2.0 and the current repo

* Apache 2.0 allows creating and distributing derivative works, including
  modified versions.
* Modified files should carry prominent notices that they were changed.
* Existing copyright / attribution / license notices should be retained.
* The license does not grant trademark rights for the upstream product name, so
  using the exact original name as the main brand is legally and strategically
  weaker than documenting the upstream origin and choosing a differentiated
  presentation.

### Feasible approaches here

**Approach A: Full rename now** (Recommended if we want an independent product)

* How it works:
  pick a new product/repo name now, update README, package name, env defaults,
  metadata, i18n app strings, GitHub links, Docker references, and visible UI
  branding.
* Pros:
  strongest differentiation from upstream, clearer ownership, less future
  confusion.
* Cons:
  larger churn, more files to touch, risk of missing scattered references.

**Approach B: Transitional fork branding** (Selected)

* How it works:
  keep technical identifiers temporarily where useful, but rewrite README and
  public copy to say "<new team/project> based on JadeAI", then gradually finish
  in-app renaming later.
* Pros:
  lower immediate risk, honest about origin, good for staged migration.
* Cons:
  mixed branding remains for a while, README and UI may not fully match.

**Approach C: Keep JadeAI name, only add attribution**

* How it works:
  retain current naming, only add "maintained fork" messaging and update our
  operational docs.
* Pros:
  smallest short-term change.
* Cons:
  weakest differentiation, highest confusion risk, may be undesirable from a
  trademark / product identity perspective.

### Naming shortlist notes

* As of 2026-03-25, quick searches suggest several obvious resume-product names
  are already in use, including `OfferPath`, `Hireflow`, `CareerDraft`,
  `ResumePilot`, `ResumeForge`, and `Resume Rover`.
* Because the user already likes the `Rover` stem, the strongest direction is
  likely to keep `Rover` and choose a clearer descriptor around it instead of
  switching to another crowded generic compound.
* Current shortlist to discuss:
  `RoleRover`, `RoverResume`, `RoverCV`

## Technical Approach

Adopt `RoleRover` as the public-facing brand while preserving Apache 2.0
attribution and upstream traceability. Migrate the highest-visibility branding
and the lowest-risk technical identifiers first:

* README / docs / NOTICE
* logo, metadata, UI strings, share-page CTA labels
* package name and local config defaults
* MCP server identity and user-agent strings
* local helper scripts and compose defaults

Keep current repo-path references unchanged until a dedicated repository rename
is scheduled.

## Decision (ADR-lite)

**Context**: The project is an Apache 2.0 derivative of JadeAI, but continuing
to present it purely as `JadeAI` would blur product ownership and make the fork
harder to position and maintain independently.

**Decision**: Adopt `RoleRover` as the public product name. Use a transitional
rename strategy: move docs, branding, defaults, and most technical identifiers
to `RoleRover` now, while preserving upstream attribution and current repo-path
references.

**Consequences**:

* Immediate user-facing clarity improves.
* License and attribution remain intact through `LICENSE` and `NOTICE`.
* A future repo rename is still desirable to remove the last path-based
  `JadeAI` references.
* Backward compatibility is preserved for `JADEAI_SKIP_START` during the
  transition.
