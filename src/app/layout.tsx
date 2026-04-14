import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono, Instrument_Serif } from 'next/font/google';
import { ROOT_METADATA } from '@/lib/seo/metadata/defaults';
import '@/styles/globals.css';

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
  display: 'swap',
});

/**
 * Global metadata — brand defaults + preview noindex enforcement.
 *
 * Preview/staging environments get noindex via the robots field.
 * Production inherits the permissive defaults from ROOT_METADATA.
 */
const isProduction = (process.env.NEXT_PUBLIC_APP_URL ?? '').includes('tutorib.com');

export const metadata: Metadata = {
  ...ROOT_METADATA,
  ...(isProduction
    ? {}
    : {
        robots: {
          index: false,
          follow: false,
        },
      }),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${ibmPlexMono.variable} ${instrumentSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
