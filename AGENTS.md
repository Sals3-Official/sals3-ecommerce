<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:sals3-code-rules -->

# Sals3 mandatory code rules

Before any codebase edit, refactor, test change, configuration change, or package change, read and follow:

- `docs/Wiki/wiki/hot.md`
- `docs/Wiki/wiki/agent-operating-contract.md`
- `docs/Wiki/wiki/nextjs-component-security-code-rules.md`
- `docs/Wiki/wiki/project-structure-installation-and-runbook.md`

`docs/Wiki/wiki/nextjs-component-security-code-rules.md` is the strict source of truth for Next.js component architecture, server-side security checks, validation commands, and completion reporting. Do not mark code work complete when required lint, format, typecheck, build, test, E2E, or high-severity audit checks fail unless the failure is reported as a blocker.

`docs/Wiki/wiki/project-structure-installation-and-runbook.md` is the strict source of truth for repository structure, npm package installation, local run commands, and README update requirements.

Do not deploy, publish, push, or commit unless the owner explicitly asks.

<!-- END:sals3-code-rules -->
