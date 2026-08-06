import { timingSafeEqual } from 'crypto';

/**
 * Service-to-service bearer auth for the Catalog Admin API. Structural copy
 * of `sals3-portal/src/lib/storefront/auth.ts`'s pattern (verified by
 * reading it) — same `Bearer ` prefix check, same `Buffer` +
 * `timingSafeEqual` shape, applied in the opposite direction (sals3-portal
 * calls in, this repo verifies).
 */

const PREFIX = 'Bearer ';

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export default function isCatalogAdminRequestAuthorized(
  request: Request,
): boolean {
  const token = process.env.CATALOG_ADMIN_API_TOKEN;
  const authorization = request.headers.get('authorization') ?? '';

  if (
    token === undefined ||
    token === '' ||
    !authorization.startsWith(PREFIX)
  ) {
    return false;
  }

  return safeEqual(authorization.slice(PREFIX.length), token);
}
