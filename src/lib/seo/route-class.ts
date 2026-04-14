/**
 * Route classification system for SEO and indexation policy.
 *
 * Class A — public, indexable, sitemap-eligible, structured-data-eligible
 * Class B — public but non-indexable (product workflow surfaces)
 * Class C — authenticated / operational, non-indexable
 */

export type RouteClass = 'A' | 'B' | 'C';

export interface RouteClassEntry {
  /** Route class determining SEO behavior */
  routeClass: RouteClass;
  /** Human-readable label for the route family */
  label: string;
}

/**
 * Central route-class map. Every known Phase 1 (and planned Phase 1.5) route
 * family is classified here. This single source drives metadata defaults,
 * robots posture, sitemap inclusion, and structured-data eligibility.
 */
const ROUTE_CLASS_MAP: Record<string, RouteClassEntry> = {
  // ── Class A: public, indexable ──────────────────────────────────
  '/': { routeClass: 'A', label: 'Home' },
  '/how-it-works': { routeClass: 'A', label: 'How it works' },
  '/trust-and-safety': { routeClass: 'A', label: 'Trust and safety' },
  '/support': { routeClass: 'A', label: 'Support' },
  '/become-a-tutor': { routeClass: 'A', label: 'Become a tutor' },
  '/tutors/[slug]': { routeClass: 'A', label: 'Tutor profile' },

  // Phase 1.5 (entries exist for classification; pages not yet built)
  '/subjects/[subject-slug]': { routeClass: 'A', label: 'Subject page' },
  '/services/[need-slug]': { routeClass: 'A', label: 'Service page' },
  '/subjects/[subject-slug]/[need-slug]': { routeClass: 'A', label: 'Subject + service page' },

  // ── Class B: public, non-indexable ──────────────────────────────
  '/match': { routeClass: 'B', label: 'Match flow' },
  '/results': { routeClass: 'B', label: 'Results' },
  '/compare': { routeClass: 'B', label: 'Compare' },
  '/book': { routeClass: 'B', label: 'Booking' },

  // ── Class C: authenticated / operational ────────────────────────
  '/auth': { routeClass: 'C', label: 'Auth' },
  '/setup': { routeClass: 'C', label: 'Setup' },
  '/settings': { routeClass: 'C', label: 'Settings' },
  '/notifications': { routeClass: 'C', label: 'Notifications' },
  '/billing': { routeClass: 'C', label: 'Billing' },
  '/privacy': { routeClass: 'C', label: 'Privacy settings' },
  '/messages': { routeClass: 'C', label: 'Messages' },
  '/lessons': { routeClass: 'C', label: 'Lessons' },
  '/tutor': { routeClass: 'C', label: 'Tutor dashboard' },
  '/internal': { routeClass: 'C', label: 'Internal' },
};

/**
 * Look up the route class for a given pathname.
 * Returns the entry if an exact or family-prefix match exists, or `null` for
 * unknown routes (which should be treated as Class C by default).
 */
export function getRouteClass(pathname: string): RouteClassEntry | null {
  // Exact match first
  if (ROUTE_CLASS_MAP[pathname]) {
    return ROUTE_CLASS_MAP[pathname];
  }

  // Family-prefix match (e.g. "/tutor/overview" → "/tutor")
  const segments = pathname.split('/').filter(Boolean);
  for (let i = segments.length; i > 0; i--) {
    const prefix = '/' + segments.slice(0, i).join('/');
    if (ROUTE_CLASS_MAP[prefix]) {
      return ROUTE_CLASS_MAP[prefix];
    }
  }

  return null;
}

/**
 * Whether a route is eligible for indexing based on its class.
 * Unknown routes default to non-indexable.
 */
export function isIndexable(pathname: string): boolean {
  const entry = getRouteClass(pathname);
  return entry?.routeClass === 'A';
}

/**
 * Whether a route is eligible for sitemap inclusion.
 * Same rule as indexability — only Class A routes belong in the sitemap.
 */
export function isSitemapEligible(pathname: string): boolean {
  return isIndexable(pathname);
}
