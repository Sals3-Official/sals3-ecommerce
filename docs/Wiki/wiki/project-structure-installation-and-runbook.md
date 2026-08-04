---
tags: [runbook, project-structure, setup, packages, readme, nextjs, sals3]
aliases:
  - Sals3 Project Structure and Runbook
  - Project Setup and Run Commands
  - Package Installation Rules
created: 2026-08-05
updated: 2026-08-05
status: canonical
authority: implementation-guide
owner_approved: true
related:
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[hot]]"
---

# Project Structure, Installation, and Runbook

> [!IMPORTANT] Mandatory setup reference
> Read this note before changing project structure, installing packages, adding scripts, changing runtime behavior, or explaining how to run the project.

## Project Root

Repository path:

```bash
/Users/MacBook/Documents/Sals3/sals3-ecommerce
```

Obsidian vault root:

```bash
/Users/MacBook/Documents/Sals3/sals3-ecommerce/docs
```

Package manager:

```bash
npm
```

Use `package-lock.json` as the lockfile. Do not switch to `yarn`, `pnpm`, or `bun` unless the owner explicitly approves the migration.

## Current Structure

```text
sals3-ecommerce/
├── .github/workflows/verify.yml
├── .husky/
├── docs/
│   ├── .obsidian/
│   ├── Raw/
│   ├── Wiki/
│   │   ├── CLAUDE.md
│   │   └── wiki/
│   ├── assets/
│   ├── decisions/
│   ├── inbox/
│   ├── journal/
│   └── templates/
├── e2e/
├── public/
├── scripts/
├── src/
│   └── app/
├── test/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── eslint.config.mjs
├── next.config.ts
├── package-lock.json
├── package.json
├── playwright.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── vitest.config.mts
```

## Directory Rules

- `src/app/` holds Next.js App Router routes, layouts, route-level tests, and global CSS.
- `e2e/` holds Playwright end-to-end tests.
- `test/` holds shared test setup and helpers.
- `scripts/` holds local automation scripts used by npm commands.
- `public/` holds static public assets.
- `docs/` is the Obsidian vault. It is project documentation, not application runtime code.
- `docs/Wiki/wiki/` holds canonical vault notes and project operating rules.
- `docs/Raw/` holds source/reference assets such as images, PDF decks, and spreadsheets.
- Do not put application source code inside `docs/`.
- Do not put vault notes inside `src/`.

## Package Installation

Before adding a package:

1. Check whether the current stack already solves the need.
2. Prefer built-in Next.js, React, TypeScript, browser, Node.js, or existing project dependency features.
3. Avoid heavy, unmaintained, duplicate, or paid-service packages unless there is a clear approved need.
4. Check license, maintenance status, security posture, bundle impact, and runtime cost.
5. Prefer dev dependencies for build/test/tooling-only packages.

Install runtime dependencies:

```bash
cd /Users/MacBook/Documents/Sals3/sals3-ecommerce
npm install <package-name>
```

Install dev-only dependencies:

```bash
cd /Users/MacBook/Documents/Sals3/sals3-ecommerce
npm install -D <package-name>
```

After installing packages, run:

```bash
cd /Users/MacBook/Documents/Sals3/sals3-ecommerce
npm audit --audit-level=high
npm run verify
```

Update `README.md` when a package changes how the project is installed, configured, run, tested, or used.

## Running the Project

Install dependencies:

```bash
cd /Users/MacBook/Documents/Sals3/sals3-ecommerce
npm install
```

Start the development server:

```bash
cd /Users/MacBook/Documents/Sals3/sals3-ecommerce
npm run dev
```

Open:

```text
http://localhost:3000
```

Create a production build:

```bash
cd /Users/MacBook/Documents/Sals3/sals3-ecommerce
npm run build
```

Run the built app locally after a successful build:

```bash
cd /Users/MacBook/Documents/Sals3/sals3-ecommerce
npm run start
```

Do not deploy, publish, push, or commit unless the owner explicitly asks.

## Verification Commands

Lint:

```bash
npm run lint
```

Format check:

```bash
npm run format:check
```

Typecheck:

```bash
npm run typecheck:clean
```

Unit/component tests:

```bash
npm run test:run
```

End-to-end tests:

```bash
npm run test:e2e
```

Full verification:

```bash
npm run verify
npm audit --audit-level=high
```

## README Update Rule

Update `README.md` in the same task when any change adds or changes:

- a user-facing feature;
- setup or installation steps;
- package manager commands;
- environment variables;
- runtime behavior;
- scripts;
- testing workflow;
- deployment or hosting instructions, when owner-approved;
- project structure;
- important limitations or known issues.

For a new feature, the README update must explain:

- what changed;
- how to run or use it;
- any required setup;
- any relevant verification command;
- any limitation the next developer must know.

Do not let `README.md` remain the default scaffold text once project-specific behavior exists.
