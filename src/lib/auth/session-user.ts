const FIRST_NAME_MAX_LENGTH = 40;

export type SignedInSessionResponse = {
  signedIn: true;
  firstName?: string;
};

export function getSessionFirstName(displayName: unknown) {
  if (typeof displayName !== 'string') {
    return undefined;
  }

  const firstName = displayName
    .split('')
    .filter((character) => {
      const code = character.charCodeAt(0);

      return code > 31 && code !== 127;
    })
    .join('')
    .trim()
    .split(/\s+/)[0]
    ?.slice(0, FIRST_NAME_MAX_LENGTH);

  return firstName || undefined;
}

export function toSignedInSessionResponse(
  displayName: unknown,
): SignedInSessionResponse {
  const firstName = getSessionFirstName(displayName);

  return firstName ? { signedIn: true, firstName } : { signedIn: true };
}
