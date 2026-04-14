import { buildCanonicalUrl } from '../metadata/canonical';

/**
 * Input contract for tutor profile structured data.
 * Only accepts fields backed by visible, public-safe content.
 */
export interface ProfilePageInput {
  /** Public tutor display name */
  name: string;
  /** Public-facing bio or description */
  description: string;
  /** Canonical tutor profile pathname, e.g. "/tutors/ivan-petrov" */
  pathname: string;
  /** Public profile image URL (absolute) — omit if not present */
  imageUrl?: string;
  /** Subject expertise areas visible on the profile page */
  knowsAbout?: string[];
}

/**
 * ProfilePage + Person JSON-LD for approved tutor profile pages.
 *
 * Only emit this after the tutor profile passes the public quality gate.
 * Do not use for incomplete, hidden, or unapproved profiles.
 */
export function buildProfilePage(input: ProfilePageInput): Record<string, unknown> {
  const url = buildCanonicalUrl(input.pathname);

  const person: Record<string, unknown> = {
    '@type': 'Person',
    name: input.name,
    description: input.description,
    url,
  };

  if (input.imageUrl) {
    person.image = input.imageUrl;
  }

  if (input.knowsAbout && input.knowsAbout.length > 0) {
    person.knowsAbout = input.knowsAbout;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    mainEntity: person,
    url,
    name: input.name,
    description: input.description,
  };
}
