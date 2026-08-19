import { describe, expect, it } from 'vitest';
import { getSessionFullName, toSignedInSessionResponse } from './session-user';

describe('session-user', () => {
  it('keeps the whole safe display name for the header greeting', () => {
    expect(getSessionFullName('AJ Garrigues')).toBe('AJ Garrigues');
  });

  it('removes control characters, collapses whitespace, and omits missing names', () => {
    expect(getSessionFullName('\u0000 Bogs \u0007')).toBe('Bogs');
    expect(getSessionFullName('Bogs   De   Guzman')).toBe('Bogs De Guzman');
    expect(getSessionFullName('   ')).toBeUndefined();
    expect(getSessionFullName(undefined)).toBeUndefined();
  });

  it('caps a long display name so the header cannot be stretched', () => {
    expect(getSessionFullName('a'.repeat(90))).toHaveLength(60);
  });

  it('returns a minimal signed-in response without exposing full profile data', () => {
    expect(toSignedInSessionResponse('Alyssa Shopper')).toEqual({
      signedIn: true,
      fullName: 'Alyssa Shopper',
    });
    expect(toSignedInSessionResponse('')).toEqual({
      signedIn: true,
    });
  });
});
