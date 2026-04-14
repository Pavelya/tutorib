/**
 * Central site configuration.
 * All brand strings, domain references, and app-wide metadata live here.
 * Import from this file — never hardcode brand values in components or routes.
 */

export const site = {
  name: 'Mentor IB',
  domain: 'mentorib.com',
  tagline: 'Find the right IB mentor',
  description:
    'Find expert IB mentors matched to your learning needs. Mentor IB connects students with qualified International Baccalaureate mentors.',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const;

export function isProduction(): boolean {
  return site.url.includes(site.domain);
}
