import { describe, expect, it } from 'vitest';
import { CSRF_COOKIE_NAME } from '@/lib/auth/session-cookies';
import { GET } from './route';

describe('/api/auth/csrf', () => {
  it('returns a token and stores the matching httpOnly CSRF cookie', async () => {
    const response = GET();
    const body = await response.json();
    const setCookie = response.headers.get('set-cookie') ?? '';

    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(body.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(setCookie).toContain(`${CSRF_COOKIE_NAME}=${body.csrfToken}`);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie.toLowerCase()).toContain('samesite=lax');
    expect(setCookie).toContain('Path=/api/auth');
  });
});
