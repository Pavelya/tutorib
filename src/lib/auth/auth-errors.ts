/**
 * Typed auth failure states.
 *
 * Every auth error that can reach the sign-in page gets an explicit code
 * and a user-facing message. This prevents raw provider error strings
 * from leaking into the UI and ensures every failure is shaped.
 */

export type AuthErrorCode =
  | 'auth_callback_failed'
  | 'link_expired'
  | 'provider_error'
  | 'exchange_failed'
  | 'missing_code'
  | 'session_missing';

export const AUTH_ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  auth_callback_failed: 'Sign-in failed. Please try again.',
  link_expired:
    'Your sign-in link has expired. Please request a new one.',
  provider_error:
    'There was a problem with the sign-in provider. Please try again.',
  exchange_failed:
    'We could not complete sign-in. Please request a new link or try Google.',
  missing_code:
    'The sign-in link is invalid. Please request a new one.',
  session_missing:
    'Sign-in succeeded but no session was created. Please try again.',
};

/**
 * Check whether a string is one of the known auth error codes.
 */
export function isAuthErrorCode(value: string): value is AuthErrorCode {
  return value in AUTH_ERROR_MESSAGES;
}
