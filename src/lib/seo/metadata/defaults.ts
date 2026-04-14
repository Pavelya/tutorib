import type { Metadata } from 'next';

/**
 * Global brand metadata defaults.
 * Applied at the root layout level. Route-specific metadata merges on top.
 */
export const ROOT_METADATA: Metadata = {
  title: {
    default: 'Tutor IB',
    template: '%s | Tutor IB',
  },
  description:
    'Find expert IB tutors matched to your learning needs. Tutor IB connects students with qualified International Baccalaureate tutors.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
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
