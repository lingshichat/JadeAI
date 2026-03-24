# Journal - lingshichat (Part 1)

> AI development session journal
> Started: 2026-03-20

---



## Session 1: Bootstrap Trellis Frontend Guidelines

**Date**: 2026-03-20
**Task**: Bootstrap Trellis Frontend Guidelines

### Summary

Customized JadeAI frontend Trellis specs from the current codebase, replaced template placeholders with project-specific conventions, finished and archived the bootstrap-guidelines task, and verified that type-check passes while lint still has existing repo issues and no test script is defined.

### Main Changes



### Git Commits

(No commits - planning session)

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: Bootstrap Trellis workflow and local Docker startup

**Date**: 2026-03-20
**Task**: Bootstrap Trellis workflow and local Docker startup

### Summary

Bootstrapped Trellis workflow files and customized frontend guidelines for JadeAI, updated project commit policy to allow AI commits after explicit authorization, and added local Docker startup helpers for self-hosted personal use via compose.yml and docker_run_local.sh.

### Main Changes



### Git Commits

| Hash | Message |
|------|---------|
| `b888f5f` | (see git log) |
| `a898682` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 3: Add local MCP web tools for AI chat

**Date**: 2026-03-20
**Task**: Add local MCP web tools for AI chat

### Summary

Added a local MCP sidecar and Exa Pool-backed web tools for JadeAI chat, surfaced Exa Pool settings in the browser UI, handled OpenAI-compatible provider error payloads, and documented the cross-layer contract for the local web-tools flow.

### Main Changes

| Area | Description |
|------|-------------|
| Local MCP | Added a local Node/TypeScript MCP sidecar and AI SDK MCP client integration for `searchWeb` and `fetchWebPage`. |
| Settings UI | Added browser-stored Exa Pool Base URL and API key fields under Settings > AI > Web Tools. |
| Chat Flow | Merged local web tools with existing resume tools in `/api/ai/chat`, updated prompts, and kept tool traces visible in chat. |
| Provider Compat | Normalized non-standard OpenAI-compatible error payloads so rate-limit and plan-limit responses surface as readable failures instead of type validation crashes. |
| Data Repair | Fixed malformed `projects.items.items` data handling and repaired the affected resume section. |
| Docs | Added `.trellis/spec/guides/ai-web-tools-contract.md` and updated README docs for the local web-tools workflow. |

**Verification**:
- `pnpm type-check` passes.
- Targeted lint for modified feature files passes.
- Local dev server and MCP sidecar were started successfully on `localhost:3000` and `127.0.0.1:3334`.
- Browser flow was manually exercised; remaining failures traced to upstream provider rate-limit / plan-limit responses.

**Notes**:
- Full-repo `pnpm lint` still fails due to pre-existing repository-wide lint debt unrelated to this feature.
- `pnpm test` is not available because the project currently has no test script.


### Git Commits

| Hash | Message |
|------|---------|
| `643ec78` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
