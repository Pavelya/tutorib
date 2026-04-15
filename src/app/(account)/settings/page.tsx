import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveAccountState } from '@/modules/accounts/service';
import { Panel } from '@/components/Panel/Panel';
import { site } from '@/lib/config/site';
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
        <dl className={styles.fieldList}>
          <div className={styles.field}>
            <dt className={styles.label}>Name</dt>
            <dd className={styles.value}>{appUser.full_name ?? 'Not set'}</dd>
          </div>
          <div className={styles.field}>
            <dt className={styles.label}>Email</dt>
            <dd className={styles.value}>{appUser.email}</dd>
          </div>
          <div className={styles.field}>
            <dt className={styles.label}>Timezone</dt>
            <dd className={styles.value}>{appUser.timezone ?? 'Not set'}</dd>
          </div>
          <div className={styles.field}>
            <dt className={styles.label}>Language</dt>
            <dd className={styles.value}>{appUser.preferred_language_code ?? 'Not set'}</dd>
          </div>
        </dl>
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
