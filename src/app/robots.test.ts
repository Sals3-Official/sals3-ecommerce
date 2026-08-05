import { afterEach, describe, expect, it, vi } from 'vitest';
import robots from './robots';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('robots', () => {
  it('allows all crawlers and the named AI bots', () => {
    const result = robots();
    const userAgents = result.rules
      ? [result.rules].flat().map((rule) => rule.userAgent)
      : [];

    expect(userAgents).toEqual(
      expect.arrayContaining([
        '*',
        'GPTBot',
        'PerplexityBot',
        'ClaudeBot',
        'OAI-SearchBot',
      ]),
    );
  });

  it('omits sitemap when NEXT_PUBLIC_SITE_URL is not set', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');

    const result = robots();

    expect(result.sitemap).toBeUndefined();
  });

  it('includes sitemap when NEXT_PUBLIC_SITE_URL is set', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://sals3.ph');

    const result = robots();

    expect(result.sitemap).toBe('https://sals3.ph/sitemap.xml');
  });
});
