import { randomBytes } from 'node:crypto';
import {
  CSRF_COOKIE_NAME,
  CSRF_MAX_AGE_SECONDS,
  isProduction,
  noStoreJson,
} from '@/lib/auth/session-cookies';

export const dynamic = 'force-dynamic';

export function GET() {
  const csrfToken = randomBytes(32).toString('base64url');
  const response = noStoreJson({ csrfToken });

  response.cookies.set(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/api/auth',
    maxAge: CSRF_MAX_AGE_SECONDS,
  });

  return response;
}
