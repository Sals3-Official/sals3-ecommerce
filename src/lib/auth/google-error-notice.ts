/**
 * Copy for a failed Google sign-in.
 *
 * Several of these are operator instructions rather than shopper wording. They
 * are kept verbatim from the original form for now; collapsing them into one
 * visitor-safe sentence, with the setup detail moved to a server log, is
 * tracked separately.
 */

const GOOGLE_ERROR_NOTICE =
  'Google sign-in could not be completed. Check that Firebase is configured and that this domain is authorized, then try again.';
const GOOGLE_CLIENT_CONFIG_NOTICE =
  'Firebase web config is missing for this site. Add the NEXT_PUBLIC_FIREBASE values, then restart or redeploy.';
const GOOGLE_SERVER_SESSION_NOTICE =
  'Google connected, but Sals3 could not create the secure server session. Add Firebase Admin credentials on the server, then restart or redeploy.';
const GOOGLE_CSRF_NOTICE =
  'Secure Google sign-in could not start. Refresh the page and try again.';
const GOOGLE_CONFIG_NOT_FOUND_NOTICE =
  'Firebase Authentication is not enabled for this project yet. Enable Authentication > Sign-in method > Google in Firebase Console, then restart the dev server.';
const GOOGLE_UNAUTHORIZED_DOMAIN_NOTICE =
  'This domain is not authorized for Google sign-in. Add localhost or the production host in Firebase Authentication authorized domains, without protocol or port.';
const GOOGLE_PROVIDER_DISABLED_NOTICE =
  'Google sign-in is not enabled in Firebase Authentication yet. Enable the Google provider in Firebase Console, then try again.';

function readErrorField(error: unknown, field: 'code' | 'message') {
  return typeof error === 'object' && error !== null && field in error
    ? String((error as Record<string, unknown>)[field])
    : '';
}

export default function getGoogleErrorNotice(error: unknown) {
  const code = readErrorField(error, 'code');
  const message = readErrorField(error, 'message');

  if (
    code === 'auth/missing-client-config' ||
    message.includes('Firebase web configuration is missing')
  ) {
    return GOOGLE_CLIENT_CONFIG_NOTICE;
  }

  if (code === 'auth/server-session-unavailable') {
    return GOOGLE_SERVER_SESSION_NOTICE;
  }

  if (code === 'auth/csrf-unavailable') {
    return GOOGLE_CSRF_NOTICE;
  }

  if (
    code === 'auth/configuration-not-found' ||
    message.includes('CONFIGURATION_NOT_FOUND')
  ) {
    return GOOGLE_CONFIG_NOT_FOUND_NOTICE;
  }

  if (code === 'auth/unauthorized-domain') {
    return GOOGLE_UNAUTHORIZED_DOMAIN_NOTICE;
  }

  if (code === 'auth/operation-not-allowed') {
    return GOOGLE_PROVIDER_DISABLED_NOTICE;
  }

  return GOOGLE_ERROR_NOTICE;
}
