import getCsrfToken from './auth-csrf-client';
import authFlowError from './auth-flow-error';

export default async function logoutServerSession() {
  const csrfToken = await getCsrfToken('Unable to start secure sign-out.');
  const response = await fetch('/api/auth/session', {
    method: 'DELETE',
    headers: { 'x-sals3-csrf': csrfToken },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw authFlowError(
      'Unable to finish secure sign-out.',
      'auth/sign-out-unavailable',
    );
  }
}
