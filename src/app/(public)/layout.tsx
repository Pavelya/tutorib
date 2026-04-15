import type { Metadata } from 'next';
import { getSiteUrl } from '@/lib/seo/metadata/canonical';
import { site } from '@/lib/config/site';
import styles from './layout.module.css';

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
    siteName: site.name,
    locale: 'en_US',
    images: [
      {
        url: `${getSiteUrl()}/og-default.png`,
        width: 1200,
        height: 630,
        alt: `${site.name} — ${site.tagline}`,
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
    <div className={styles.publicMain}>
      {/* Public header — implemented in a later task */}
      <header />
      <main className={styles.publicContent}>{children}</main>
      {/* Public footer — implemented in a later task */}
      <footer />
    </div>
  );
}
