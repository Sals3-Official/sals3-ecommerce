import { describe, expect, it } from 'vitest';
import { getSessionFirstName, toSignedInSessionResponse } from './session-user';

describe('session-user', () => {
  it('uses only the first safe display-name segment', () => {
    expect(getSessionFirstName('AJ Garrigues')).toBe('AJ');
  });

  it('removes control characters and omits missing names', () => {
    expect(getSessionFirstName('\u0000 Bogs \u0007')).toBe('Bogs');
    expect(getSessionFirstName('   ')).toBeUndefined();
    expect(getSessionFirstName(undefined)).toBeUndefined();
  });

  it('returns a minimal signed-in response without exposing full profile data', () => {
    expect(toSignedInSessionResponse('Alyssa Shopper')).toEqual({
      signedIn: true,
      firstName: 'Alyssa',
    });
    expect(toSignedInSessionResponse('')).toEqual({
      signedIn: true,
    });
  });
});
