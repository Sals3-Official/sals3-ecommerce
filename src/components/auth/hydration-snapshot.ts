/**
 * `useSyncExternalStore` arguments that report whether the client has
 * hydrated.
 *
 * Auth submit buttons stay disabled until this flips true, so a click landing
 * before React attaches its handlers cannot fall through to the browser's
 * default form submit — which, on a form with no `action`, would put the
 * password in the URL.
 */

export function subscribeToHydration(onStoreChange: () => void) {
  queueMicrotask(onStoreChange);

  return () => undefined;
}

export function getClientHydrationSnapshot() {
  return true;
}

export function getServerHydrationSnapshot() {
  return false;
}
