import type { Metadata } from 'next';
import { resolveAccountState } from '@/modules/accounts/service';
import { getPendingLegalNotices } from '@/modules/notifications/service';
import { LegalNotice } from '@/components/LegalNotice/LegalNotice';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = await resolveAccountState();
  const pendingNotices =
    'appUser' in state ? await getPendingLegalNotices(state.appUser.id) : [];

  return (
    <>
      <LegalNotice notices={pendingNotices} />
      {/* Student navigation — implemented in a later task */}
      <nav />
      <main>{children}</main>
    </>
  );
}
