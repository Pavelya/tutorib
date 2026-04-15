import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Setup — Mentor IB',
  robots: { index: false, follow: false },
};

export default function SetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main>{children}</main>
  );
}
