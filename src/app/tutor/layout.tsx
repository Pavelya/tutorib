import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Tutor navigation — implemented in a later task */}
      <nav />
      <main>{children}</main>
    </>
  );
}
