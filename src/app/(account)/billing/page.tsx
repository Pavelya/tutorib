import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { resolveAccountState } from '@/modules/accounts/service';
import { Panel } from '@/components/Panel/Panel';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { site } from '@/lib/config/site';
import styles from './billing.module.css';

export const metadata: Metadata = {
  title: `Billing — ${site.name}`,
};

export default async function BillingPage() {
  const state = await resolveAccountState();

  if (state.status === 'unauthenticated' || !('appUser' in state)) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Billing</h1>

      <Panel as="section" variant="default" className={styles.section}>
        <h2 className={styles.sectionHeading}>Payment history</h2>
        <EmptyState
          heading="No payments yet"
          description="Your lesson payment history will appear here after your first booking."
        />
      </Panel>
    </div>
  );
}
