import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { resolveAccountState } from '@/modules/accounts/service';
import { getUnreadCount, getPendingLegalNotices } from '@/modules/notifications/service';
import { AccountNav } from '@/components/AccountNav/AccountNav';
import { LegalNotice } from '@/components/LegalNotice/LegalNotice';
import styles from './layout.module.css';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = await resolveAccountState();

  if (state.status === 'unauthenticated') {
    redirect('/auth/sign-in');
  }

  // Role-pending users can access account routes (per route-family entry rules)
  if (state.status === 'authenticated_no_profile') {
    redirect('/setup/role');
  }

  // At this point we have an appUser
  if (!('appUser' in state)) {
    notFound();
  }

  const [unreadCount, pendingNotices] = await Promise.all([
    getUnreadCount(state.appUser.id),
    getPendingLegalNotices(state.appUser.id),
  ]);

  return (
    <div className={styles.shell}>
      <LegalNotice notices={pendingNotices} />
      <div className={styles.container}>
        <AccountNav unreadCount={unreadCount} />
        <main>{children}</main>
      </div>
    </div>
  );
}
