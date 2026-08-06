import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 moved the datasource connection string out of schema.prisma and
 * no longer auto-loads .env for the CLI, so this loads it explicitly
 * (Node 20.6+ built-in — no `dotenv` dependency needed). Runtime
 * `PrismaClient` instances get their connection through the
 * `@prisma/adapter-pg` driver adapter in `src/lib/prisma.ts` instead; this
 * config file is for the `prisma migrate`/`prisma studio` CLI only.
 */
try {
  process.loadEnvFile();
} catch {
  // No .env file — fine when DATABASE_URL is already set in the shell.
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
