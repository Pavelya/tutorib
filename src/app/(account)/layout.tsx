import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Account navigation — implemented in a later task */}
      <nav />
      <main>{children}</main>
    </>
  );
}
