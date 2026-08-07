/**
 * Error carrying a stable machine code alongside its message.
 *
 * The code is what the UI branches on. Matching on prose would break the
 * moment the copy is reworded, and the server deliberately returns codes
 * rather than sentences so that no user-facing wording is decided outside
 * the components that render it.
 */
export type AuthFlowError = Error & { code: string };

export default function authFlowError(
  message: string,
  code: string,
): AuthFlowError {
  return Object.assign(new Error(message), { code });
}

export function getAuthFlowErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}
