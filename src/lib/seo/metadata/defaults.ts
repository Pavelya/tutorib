import type { Metadata } from 'next';
import { site } from '@/lib/config/site';

/**
 * Global brand metadata defaults.
 * Applied at the root layout level. Route-specific metadata merges on top.
 */
export const ROOT_METADATA: Metadata = {
  title: {
    default: site.name,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  metadataBase: new URL(site.url),
  icons: {
    icon: '/favicon.ico',
  },
};

/**
 * Non-indexable metadata defaults for Class B / Class C routes.
 * Applied at student, tutor, account, and auth layout levels.
 */
export const NOINDEX_METADATA: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};
