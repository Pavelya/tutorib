/**
 * Canonical URL generation for public routes.
 *
 * One production origin, one path builder, one parameter-handling policy.
 * Routes call this — they never manually concatenate canonical URLs.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

/**
 * Returns the canonical origin (no trailing slash).
 */
export function getSiteUrl(): string {
  return SITE_URL.replace(/\/$/, '');
}

/**
 * Build a canonical URL from a pathname.
 * Strips query parameters and trailing slashes to produce one clean canonical.
 *
 * @param pathname — the route path, e.g. "/how-it-works" or "/tutors/ivan-petrov"
 */
export function buildCanonicalUrl(pathname: string): string {
  const base = getSiteUrl();
  // Strip query string
  const clean = pathname.split('?')[0];
  // Normalize: no trailing slash (except root)
  const normalized = clean === '/' ? '' : clean.replace(/\/$/, '');
  return `${base}${normalized}`;
}
