<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

Use the `/trellis:start` command when starting a new session to:
- Initialize your developer identity
- Understand current project context
- Read relevant guidelines

Use `@/.trellis/` to learn:
- Development workflow (`workflow.md`)
- Project structure guidelines (`spec/`)
- Developer workspace (`workspace/`)

Keep this managed block so 'trellis update' can refresh the instructions.

<!-- TRELLIS:END -->

## Project Commit Policy

- By default, AI should not run `git commit`.
- After the user gives explicit authorization for the current changes, AI may
  stage and commit on the user's behalf.
- Before any AI-created commit, run the relevant finish/check flow and confirm
  what will be included in the commit.
