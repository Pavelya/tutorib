import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveAccountState } from '@/modules/accounts/service';
import { Panel } from '@/components/Panel/Panel';
import { InlineNotice } from '@/components/InlineNotice/InlineNotice';
import { site } from '@/lib/config/site';
import styles from './privacy.module.css';

export const metadata: Metadata = {
  title: `Privacy — ${site.name}`,
};

export default async function PrivacyPage() {
  const state = await resolveAccountState();

  if (state.status === 'unauthenticated' || !('appUser' in state)) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Privacy</h1>

      <Panel as="section" variant="default" className={styles.section}>
        <h2 className={styles.sectionHeading}>Your data</h2>
        <p className={styles.description}>
          {site.name} stores only the information needed to provide tutoring services.
          You can request a copy of your data or delete your account at any time.
        </p>
      </Panel>

      <Panel as="section" variant="default" className={styles.section}>
        <h2 className={styles.sectionHeading}>Delete account</h2>
        <p className={styles.description}>
          Deleting your account permanently removes your profile, lesson history, and messages.
          This action cannot be undone.
        </p>
        <InlineNotice variant="warning">
          To delete your account, please contact support. Active bookings must be resolved first.
        </InlineNotice>
      </Panel>
    </div>
  );
}
