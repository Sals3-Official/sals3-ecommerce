import { describe, expect, it } from 'vitest';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/site';
import { GET } from './route';

describe('GET /llms.txt', () => {
  it('returns plain text identifying the site', async () => {
    const response = GET();
    const body = await response.text();

    expect(response.headers.get('Content-Type')).toBe(
      'text/plain; charset=utf-8',
    );
    expect(body).toContain(SITE_NAME);
    expect(body).toContain(SITE_DESCRIPTION);
    expect(body).toContain(SITE_TAGLINE);
  });
});
