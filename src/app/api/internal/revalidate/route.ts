import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import checkRateLimit from '@/lib/rate-limit';
import { isRevalidatableTag } from '@/lib/storefront/revalidation-tags';

/**
 * Lets the Portal expire this storefront's catalogue caches the moment a
 * listing is published, paused or resumed.
 *
 * ## Why this exists
 *
 * The product page read is cached for
 * `PRODUCT_PAGE_REVALIDATE_SECONDS` (`services/storefront/client.ts`), and
 * nothing invalidated it. So a seller who paused a mispriced or withdrawn
 * listing kept selling it for up to a minute afterwards — the Portal said
 * "off the storefront" and the storefront disagreed for another 60 seconds
 * (owner report 2026-09-04). The cache stays as the fallback; this closes the
 * window on the normal path.
 *
 * ## `revalidateTag(tag, { expire: 0 })`, deliberately
 *
 * `updateTag` is the immediate one, and it is unreachable here: Next allows it
 * only inside a Server Action, never a Route Handler. `revalidateTag(tag, 'max')`
 * is the recommended default but gives stale-while-revalidate — the very next
 * buyer would still be served the paused product once, which is the one thing
 * this endpoint exists to prevent. Next's own documentation names this case:
 * *"For webhooks or third-party services that need immediate expiration, you
 * can pass `{ expire: 0 }`… This pattern is necessary when external systems
 * call your Route Handlers and require data to expire immediately."*
 *
 * ## Security
 *
 * A shared secret in `Authorization: Bearer`, compared in constant time, and an
 * allow-list on the tags themselves. The allow-list is not belt-and-braces: the
 * tag names arrive over the network, and without it a leaked secret would let a
 * caller expire any tag in the application rather than only catalogue reads.
 *
 * Unset secret means the endpoint is closed, not open — every request is
 * refused, and the Portal skips calling it (see its
 * `publish-side-effects.ts`), leaving today's 60-second behaviour untouched
 * rather than a route that trusts anyone.
 */

export const dynamic = 'force-dynamic';

/** Bounded so one call cannot be used to sweep the whole cache. */
const RevalidateRequestSchema = z.object({
  tags: z.array(z.string().min(1).max(256)).min(1).max(20),
});

const RATE_LIMIT = { limit: 120, windowMs: 60_000 };

function unauthorized(): NextResponse {
  // No detail: a caller that guessed wrong learns only that it guessed wrong.
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

/** Constant-time, and length-safe — `timingSafeEqual` throws on a length mismatch. */
function secretMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);

  if (a.length !== b.length) return false;

  return timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<NextResponse> {
  const expected = process.env.STOREFRONT_REVALIDATE_SECRET;

  if (expected === undefined || expected === '') return unauthorized();

  const header = request.headers.get('authorization') ?? '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (presented === '' || !secretMatches(presented, expected)) {
    return unauthorized();
  }

  if (!checkRateLimit({ key: 'storefront-revalidate', ...RATE_LIMIT })) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const parsed = RevalidateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const allowed = parsed.data.tags.filter(isRevalidatableTag);

  allowed.forEach((tag) => {
    revalidateTag(tag, { expire: 0 });
  });

  // `revalidated` is what was acted on, not what was asked for: a caller that
  // sent a tag this storefront will not expire should be able to see that from
  // the response rather than assume it worked.
  return NextResponse.json({ revalidated: allowed });
}
