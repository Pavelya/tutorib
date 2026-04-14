import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Student navigation — implemented in a later task */}
      <nav />
      <main>{children}</main>
    </>
  );
}
