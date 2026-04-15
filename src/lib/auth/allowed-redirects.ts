/**
 * Callback and return-path allowlist.
 *
 * The `next` parameter in the auth callback lets callers specify where
 * to send the user after sign-in. This must be restricted to approved
 * internal paths so an attacker cannot use the callback as an open redirect.
 *
 * Rules:
 * - Only relative paths (starting with `/`) are allowed.
 * - The path must match one of the approved prefixes.
 * - Anything else falls through to the default post-auth destination.
 */

const ALLOWED_PATH_PREFIXES = [
  '/match',
  '/tutor/',
  '/lessons/',
  '/messages/',
  '/settings',
  '/notifications',
  '/privacy',
  '/billing',
  '/setup/',
] as const;

/**
 * Validate a `next` redirect target from the auth callback.
 * Returns the path if it is safe, or `null` if it should be ignored.
 */
export function validateRedirectPath(next: string | null): string | null {
  if (!next) return null;

  // Must be a relative path — reject absolute URLs, protocol-relative, and data URIs
  if (!next.startsWith('/') || next.startsWith('//')) return null;

  // Normalise to prevent path traversal (e.g. /../evil)
  const normalised = decodeURIComponent(next).replace(/\/+/g, '/');
  if (normalised.includes('..')) return null;

  const matchesAllowlist = ALLOWED_PATH_PREFIXES.some((prefix) =>
    normalised.startsWith(prefix),
  );

  return matchesAllowlist ? next : null;
}
