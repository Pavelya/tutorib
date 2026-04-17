import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveAccountState } from '@/modules/accounts/service';
import { Panel } from '@/components/Panel/Panel';
import { site } from '@/lib/config/site';
import { ProfileForm } from './ProfileForm';
import styles from './settings.module.css';

export const metadata: Metadata = {
  title: `Settings — ${site.name}`,
};

export default async function SettingsPage() {
  const state = await resolveAccountState();

  if (state.status === 'unauthenticated' || !('appUser' in state)) {
    notFound();
  }

  const { appUser } = state;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Settings</h1>

      <Panel as="section" variant="default" className={styles.section}>
        <h2 className={styles.sectionHeading}>Profile</h2>
        <ProfileForm initialName={appUser.full_name} email={appUser.email} />
      </Panel>

      <Panel as="section" variant="default" className={styles.section}>
        <h2 className={styles.sectionHeading}>Account</h2>
        <dl className={styles.fieldList}>
          <div className={styles.field}>
            <dt className={styles.label}>Role</dt>
            <dd className={styles.value}>{appUser.primary_role_context ?? 'Pending'}</dd>
          </div>
          <div className={styles.field}>
            <dt className={styles.label}>Status</dt>
            <dd className={styles.value}>{appUser.account_status}</dd>
          </div>
        </dl>
      </Panel>
    </div>
  );
}
