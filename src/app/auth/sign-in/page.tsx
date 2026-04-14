import type { Metadata } from 'next';
import { Panel } from '@/components/Panel/Panel';
import { SignInForm } from './SignInForm';
import styles from '../auth.module.css';

export const metadata: Metadata = {
  title: 'Sign in — Tutor IB',
  robots: { index: false, follow: false },
};

interface SignInPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const callbackError = typeof params.error === 'string' ? params.error : undefined;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Sign in to Tutor IB</h1>
          <p className={styles.subtitle}>
            Find your perfect IB tutor or manage your tutoring practice.
          </p>
        </div>
        <Panel>
          <SignInForm callbackError={callbackError} />
        </Panel>
      </div>
    </div>
  );
}
