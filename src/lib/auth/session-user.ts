const FULL_NAME_MAX_LENGTH = 60;

export type SignedInSessionResponse = {
  signedIn: true;
  fullName?: string;
};

/**
 * The header greets the buyer by full name, so the session endpoint returns the
 * whole verified display name instead of its first segment. It is still the
 * *only* profile field that crosses to the client: no email, no uid, no
 * provider, no custom claims. Control characters are stripped and runs of
 * whitespace collapsed so a crafted Firebase display name cannot smuggle
 * layout-breaking or log-poisoning characters into the header, and the result is
 * capped so a very long name cannot stretch the utility bar.
 */
export function getSessionFullName(displayName: unknown) {
  if (typeof displayName !== 'string') {
    return undefined;
  }

  const fullName = displayName
    .split('')
    .filter((character) => {
      const code = character.charCodeAt(0);

      return code > 31 && code !== 127;
    })
    .join('')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, FULL_NAME_MAX_LENGTH)
    .trim();

  return fullName || undefined;
}

export function toSignedInSessionResponse(
  displayName: unknown,
): SignedInSessionResponse {
  const fullName = getSessionFullName(displayName);

  return fullName ? { signedIn: true, fullName } : { signedIn: true };
}
