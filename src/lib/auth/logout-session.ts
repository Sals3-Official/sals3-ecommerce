function isCsrfResponse(value: unknown): value is { csrfToken: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'csrfToken' in value &&
    typeof value.csrfToken === 'string' &&
    value.csrfToken.length >= 32
  );
}

async function getCsrfToken() {
  const response = await fetch('/api/auth/csrf', { cache: 'no-store' });

  if (!response.ok) {
    throw new Error('Unable to start secure sign-out.');
  }

  const body: unknown = await response.json();

  if (!isCsrfResponse(body)) {
    throw new Error('Unable to start secure sign-out.');
  }

  return body.csrfToken;
}

export default async function logoutServerSession() {
  const csrfToken = await getCsrfToken();
  const response = await fetch('/api/auth/session', {
    method: 'DELETE',
    headers: { 'x-sals3-csrf': csrfToken },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to finish secure sign-out.');
  }
}
