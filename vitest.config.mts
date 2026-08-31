import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      /*
        See `test/server-only-stub.ts`. The real package picks its entry by
        export condition, and a `jsdom` environment matches the browser one —
        the entry that throws — so a test rendering a server component tree that
        reaches `import 'server-only'` fails on the guard instead of on the
        component.

        Aliased here rather than mocked per file: the guard is about where code
        runs, and a per-file list is one somebody forgets to add to. `next
        build` still resolves the real package, so a genuine client component
        importing server-only code remains a build failure.
      */
      'server-only': fileURLToPath(
        new URL('./test/server-only-stub.ts', import.meta.url),
      ),
    },
  },
  test: {
    css: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
  },
});
