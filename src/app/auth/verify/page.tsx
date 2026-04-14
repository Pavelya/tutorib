import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/lib/config/site';
import styles from '../auth.module.css';

export const metadata: Metadata = {
  title: `Check your email — ${site.name}`,
  robots: { index: false, follow: false },
};

export default function VerifyPage() {
  return (
    <div className={styles.verifyContainer}>
      <div className={styles.verifyCard}>
        <h1 className={styles.verifyTitle}>Check your email</h1>
        <p className={styles.verifyDescription}>
          We sent you a sign-in link. Click the link in the email to continue to {site.name}.
        </p>
        <Link href="/auth/sign-in" className={styles.backLink}>
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
