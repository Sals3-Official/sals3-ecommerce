'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { isKnownDestinationCode } from './destinations';
import {
  DESTINATION_COOKIE_NAME,
  DESTINATION_COOKIE_MAX_AGE_SECONDS,
} from './resolve';

export type SetDestinationResult = { ok: true } | { ok: false; reason: string };

/**
 * Records the destination the buyer picked.
 *
 * **Not `httpOnly`, unlike `sals3_session`.** The session cookie is a
 * credential and must be unreadable by scripts; this is a display preference
 * whose worst case is a wrong label on a header button. Marking it `httpOnly`
 * would buy nothing and cost the ability to read it client-side later.
 *
 * Validated against the allow list rather than stored as given, so a crafted
 * value cannot put arbitrary text into a cookie that the header then renders.
 *
 * `revalidatePath('/', 'layout')` rather than relying on the caller's
 * `router.refresh()` alone. Refresh re-renders **the route the buyer is on**;
 * the client router cache still holds every other route they have visited, each
 * with the old destination baked into its header. Without this, choosing
 * Australia on `/cart` and navigating back to a cached `/` would still read
 * `Ship to: Somewhere else`.
 *
 * The whole subtree in one call rather than a list of routes: `sals3-portal`
 * learned that the expensive way — nine action files each carried a literal
 * `revalidatePath('/listings')` while the editor had moved to a child route, so
 * every one of them silently invalidated nothing. A list of literal paths is a
 * list that goes stale without saying so.
 *
 * Deliberately broad, and cheap to be broad: no page's *content* depends on the
 * destination — only the header label and one cart banner — and a person
 * changes destination approximately never.
 */
export async function setDestinationAction(
  code: string,
): Promise<SetDestinationResult> {
  if (typeof code !== 'string' || !isKnownDestinationCode(code)) {
    return { ok: false, reason: 'unknown_destination' };
  }

  const cookieStore = await cookies();

  cookieStore.set(DESTINATION_COOKIE_NAME, code, {
    path: '/',
    maxAge: DESTINATION_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  revalidatePath('/', 'layout');

  return { ok: true };
}
