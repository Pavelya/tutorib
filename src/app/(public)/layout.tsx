import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/seo/metadata/canonical';

/**
 * Public layout metadata — shared defaults for Class A public routes.
 *
 * Individual routes override title, description, and canonical via their own
 * metadata exports or generateMetadata. This layout provides the public-site
 * Open Graph baseline and indexable robots posture.
 */
export const metadata: Metadata = {
  openGraph: {
    type: 'website',
    siteName: 'Tutor IB',
    locale: 'en_US',
    images: [
      {
        url: `${getSiteUrl()}/og-default.png`,
        width: 1200,
        height: 630,
        alt: 'Tutor IB — Find the right IB tutor',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Public header — implemented in a later task */}
      <header />
      <main>{children}</main>
      {/* Public footer — implemented in a later task */}
      <footer />
    </>
  );
}
