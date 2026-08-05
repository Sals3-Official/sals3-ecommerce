---
tags: [governance, code-quality, security, nextjs, verification, cost-efficiency, image-optimization, sals3]
aliases:
  - Next.js Component Architecture and Security
  - Sals3 Code Editing Rules
  - Mandatory Next.js Code Gate
created: 2026-08-05
updated: 2026-08-05
status: canonical
authority: constitutional
owner_approved: true
related:
  - "[[agent-operating-contract]]"
  - "[[project-structure-installation-and-runbook]]"
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-management-bible]]"
  - "[[hot]]"
  - "[[sals3-geo-aeo-seo-strategy-proposal]]"
  - "[[parked-ideas-backlog]]"
---

# Next.js Component Architecture and Security

> [!IMPORTANT] Mandatory code-change gate
> This note is mandatory for every Sals3 codebase edit, new feature, refactor, bug fix, test change, configuration change, and package change. Read and follow it before modifying code. Do not mark code work complete when any required verification command fails.

## Enforcement

- Applies to all source-code work in this repository, including `src/`, `app/`, `components/`, `lib/`, `test/`, `e2e/`, config files, scripts, and `package.json`.
- Keep changes component-by-component and independently reviewable.
- Use actual repository scripts from `package.json`; do not invent validation commands.
- If a command is not applicable to the change, state why in the final summary.
- If a command fails, fix the failure or report the blocker. Do not hide, skip, or downgrade failures.
- Update `README.md` in the same task when a feature, setup step, package command, runtime behavior, project structure, test workflow, or important limitation changes. See [[project-structure-installation-and-runbook#README Update Rule]].
- Treat internet and AI visibility as a first-class product priority when changing routes, public content, metadata, structured data, crawling rules, or machine-readable endpoints. SEO, GEO, and AEO work must be considered early in the implementation plan, not only as a late checklist item.
- Do not deploy, publish, push, or commit unless the owner explicitly asks.

## SEO, GEO, and AEO Discoverability

> [!IMPORTANT] Check this on every route, metadata, or structured-data change
> [[sals3-geo-aeo-seo-strategy-proposal]] is the canonical reference for how Sals3 should be discoverable by search engines, generative AI (ChatGPT, Perplexity, Claude, Gemini), and answer engines. It is not fully approved or built — most of it is intentionally parked in [[parked-ideas-backlog]] pending routes that don't exist yet — but it must be actively checked, not forgotten, whenever code touches this surface.

- Prioritize discoverability for both regular internet search and AI answer surfaces. For public ecommerce surfaces, plan SEO (search engine visibility), GEO (generative engine visibility), and AEO (answer engine visibility) alongside component architecture, security, accessibility, performance, and cost-efficiency.
- Before adding, moving, or removing any page/route (especially a new PDP, category, cart, or checkout route), check [[parked-ideas-backlog]] for GEO/AEO/SEO entries whose **unblock condition** the new route now satisfies (e.g. a `/p/[id]` route unblocks per-route `generateMetadata` and `Product`/`Offer`/`AggregateRating`/`FAQPage` JSON-LD). Do not ship a new route without at least considering whether it should carry its corresponding entry from [[sals3-geo-aeo-seo-strategy-proposal]] — implement it if the data backing it is real, or explicitly note why it's still deferred.
- Before adding or changing `generateMetadata`, any `<script type="application/ld+json">` / structured-data block, `robots.ts`, `sitemap.ts`, or `llms.txt`, read [[sals3-geo-aeo-seo-strategy-proposal]] first so the pattern stays consistent with what's already shipped (`src/app/robots.ts`, `src/app/llms.txt/route.ts`, `src/components/schema/OrganizationSchema.tsx`, `src/lib/site.ts`).
- Never fill a structured-data field (URL, logo, rating, price, catalog listing, etc.) with a guessed or placeholder value. Gate it behind a real, confirmed data source or an explicit env var and omit the field when unset — see [[sals3-skills]] lesson 14. Google's structured-data guidelines can penalize fabricated schema with a manual action and loss of all rich results for the domain, not just an inaccurate sentence.
- Do not present placeholder/external demo data (e.g. the current DummyJSON product feed) as Sals3's own catalog in any AI- or crawler-facing surface (`llms.txt`, JSON-LD, sitemap). Wait for a real, Sals3-owned catalog.
- When a parked GEO/AEO/SEO item gets implemented, move it out of [[parked-ideas-backlog]] (or strike it through per that note's own protocol) and update [[sals3-geo-aeo-seo-strategy-proposal]]'s implementation-status section in the same task.

## Component Architecture

When implementing or modifying a feature:

1. Never create monolithic page components.
2. Keep `page.tsx` and `layout.tsx` focused on composition and data orchestration.
3. Use one main exported React component per file.
4. Keep component files below 150 lines whenever practical.
5. Keep component functions below 80 lines whenever practical.
6. Extract repeated or complex UI sections into reusable components.
7. Extract stateful behavior into custom hooks.
8. Extract API calls and business logic into services, repositories, or server actions.
9. Keep schemas, constants, utilities, and types in separate files.
10. Use Server Components by default.
11. Place `"use client"` at the smallest possible component boundary.
12. Do not split trivial markup into unnecessary components.
13. Avoid duplicated components, hooks, utilities, and business logic.
14. After implementation, review all changed files and refactor oversized or duplicated code.

## Security Requirements

15. Treat all client-provided data as untrusted.
16. Validate and sanitize all inputs using a schema validation library such as Zod.
17. Perform validation on the server even when client-side validation already exists.
18. Perform authentication and authorization checks on every protected server action, route handler, and API endpoint.
19. Never rely only on hidden buttons, disabled UI elements, middleware, or client-side checks for authorization.
20. Verify that the authenticated user has permission to access or modify the requested resource.
21. Prevent insecure direct object reference vulnerabilities by checking resource ownership or role permissions.
22. Never expose secrets, private API keys, database credentials, or service credentials to client components.
23. Only use the `NEXT_PUBLIC_` prefix for values that are safe to expose publicly.
24. Never commit `.env` files, credentials, tokens, or private keys to the repository.
25. Keep database queries parameterized. Never build queries by directly concatenating user input.
26. Escape or sanitize user-generated HTML. Avoid `dangerouslySetInnerHTML` unless the content is sanitized and its use is documented.
27. Protect cookie-based mutations against CSRF attacks.
28. Use secure cookie settings where applicable:

    - `httpOnly`
    - `secure`
    - `sameSite`

29. Apply rate limiting to authentication, password reset, verification, search, upload, payment, and other abuse-sensitive endpoints.
30. Validate uploaded files by size, type, extension, and actual file content when possible.
31. Do not trust filenames or paths provided by users.
32. Prevent users from controlling internal URLs, redirects, file paths, database fields, or server commands without strict allow-list validation.
33. Use allow lists instead of block lists for roles, permissions, redirect URLs, file types, and accepted values.
34. Do not expose stack traces, database errors, internal paths, secrets, or implementation details in production responses.
35. Never log passwords, access tokens, refresh tokens, session cookies, payment details, or sensitive personal information.
36. Use generic error messages for users and structured server-side logging for debugging.
37. Add appropriate security headers through Next.js configuration or the hosting platform.
38. Review third-party packages before adding them. Avoid unnecessary or unmaintained dependencies.
39. Run dependency security checks and resolve critical or high-severity vulnerabilities before completion.
40. Do not disable ESLint, TypeScript, security rules, or tests merely to make the implementation pass.
41. Do not use `any`, unsafe type assertions, or validation bypasses unless there is a documented technical reason.
42. Apply the principle of least privilege to users, services, database accounts, API keys, and cloud permissions.
43. For sensitive operations, confirm the action on the server and make the operation idempotent when applicable.
44. Ensure sensitive pages and API responses are not cached publicly.
45. Review new endpoints and server actions for:

    - Broken authentication
    - Broken authorization
    - Injection vulnerabilities
    - Cross-site scripting
    - Cross-site request forgery
    - Server-side request forgery
    - Open redirects
    - Sensitive data exposure
    - Unsafe file uploads
    - Missing rate limiting

## Cost-Efficient Engineering

46. Prefer the simplest reliable implementation that meets the accepted requirement.
47. Reuse existing components, hooks, utilities, schemas, tests, and platform features before adding new dependencies or services.
48. Avoid paid external services, background jobs, cron tasks, queues, storage buckets, image CDNs, analytics products, AI calls, and third-party APIs unless the owner approves the cost and operational need.
49. Prefer static rendering, Server Components, request memoization, caching, pagination, and incremental loading when they reduce compute, bandwidth, database reads, or API calls without hurting correctness.
50. Avoid unnecessary client-side JavaScript. Keep interactive client boundaries small.
51. Avoid duplicate data fetching. Share server-side loaders, cache stable reads, and batch requests where practical.
52. Do not poll frequently by default. Use user-triggered refresh, cache invalidation, webhooks, or sensible intervals.
53. Limit log volume. Keep logs useful for debugging and audit, but do not log noisy payloads, repeated events, or sensitive data.
54. Keep bundle size small. Do not add heavy UI, chart, date, animation, image, or utility libraries when a lighter existing option works.
55. Design database reads and writes to avoid avoidable N+1 queries, unbounded scans, over-fetching, and repeated writes.
56. When changing architecture, mention expected cost impact in the task summary: lower, neutral, higher, or unknown.

## Image Optimization

57. Optimize images through code by default. Do not ship raw oversized images when code can resize, compress, lazy-load, or serve a better format.
58. Use Next.js image optimization (`next/image`) for rendered images unless there is a documented reason not to.
59. Always provide meaningful `alt` text for informative images. Use empty `alt=""` only for truly decorative images.
60. Set stable image dimensions with `width` and `height`, `fill` with a constrained parent, or CSS `aspect-ratio` to prevent layout shift.
61. Use responsive `sizes` values so mobile devices do not download desktop-sized images.
62. Use `priority` only for above-the-fold critical images. Lazy-load non-critical images.
63. Prefer AVIF or WebP output when supported. Keep original assets only when needed for source quality or future editing.
64. Compress and resize uploaded or repository-stored images before display and storage when practical.
65. Do not use untrusted remote image domains without explicit allow-listing in `next.config.ts`.
66. Validate user-uploaded images by size, MIME type, extension, and actual file content when possible.
67. Strip metadata from uploaded images when privacy matters.
68. Use placeholders, blur data URLs, or skeletons only when they improve perceived performance without adding excessive bundle or processing cost.
69. Avoid base64-inlining large images in code or CSS. Use static files or optimized delivery.
70. Verify visual image changes on at least one desktop and one mobile viewport when the UI changed.

## Completion Checklist

Before completing any code task:

1. Review all changed files for component decomposition and duplicated logic.
2. Review all server actions, route handlers, and API endpoints for authentication and authorization.
3. Confirm that all external input is validated on the server.
4. Confirm that no secrets or sensitive information are exposed to the client or logs.
5. Confirm that the implementation avoids unnecessary paid services, dependencies, compute, database reads, API calls, and bundle weight.
6. Confirm that all added or changed images are optimized through code and use stable dimensions, responsive sizing, lazy loading where appropriate, and safe allow-listed sources.
7. Confirm that any public route, metadata, structured-data, `robots.ts`, `sitemap.ts`, or `llms.txt` change treats SEO, GEO, and AEO visibility as a priority, implements the real-data-backed pieces that are unblocked, and documents any deferred pieces.
8. Update `README.md` if the task added or changed a feature, setup step, package command, runtime behavior, project structure, test workflow, or important limitation.
9. Run the relevant checks:

```bash
cd /Users/MacBook/Documents/Sals3/sals3-ecommerce

npm run lint
npm run format:check
npm run typecheck:clean
npm run build
npm run test:run
npm run test:e2e
npm audit --audit-level=high
```

10. For full project verification, use:

```bash
cd /Users/MacBook/Documents/Sals3/sals3-ecommerce

npm run verify
npm audit --audit-level=high
```

11. Fix all lint errors, format errors, type errors, test failures, build failures, and critical or high-severity security vulnerabilities.
12. Do not mark the task as complete if required validation commands fail.
13. Summarize:

    - Files changed
    - Architectural decisions
    - Security controls added
    - Cost-efficiency choices
    - Image optimization applied
    - Tests performed
    - Remaining risks or limitations
