/**
 * What `server-only` resolves to under vitest.
 *
 * The real package ships two entries: a no-op for the server build and one that
 * throws for a client bundle. Which you get is decided by export conditions, and
 * a `jsdom` test environment matches the browser one — so a test that renders a
 * server component tree reaching `import 'server-only'` fails on the guard
 * rather than on anything about the component.
 *
 * The server build's entry is a no-op, and this is that. Aliased in
 * `vitest.config.mts` rather than mocked per file: the guard is about where code
 * *runs*, and a per-file list is one somebody forgets to add to the day a
 * component tree grows an import.
 *
 * This does **not** weaken the guard where it matters — `next build` still
 * resolves the real package, so a genuine client component importing
 * server-only code is a build failure exactly as before.
 */
export {};
