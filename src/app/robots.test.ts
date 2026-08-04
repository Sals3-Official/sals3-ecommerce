import { describe, expect, it } from 'vitest';
import robots from './robots';

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
});
