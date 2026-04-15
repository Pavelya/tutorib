import Link from 'next/link';
import { site } from '@/lib/config/site';
import styles from './tutor-profile.module.css';

export default function TutorNotFound() {
  return (
    <article className={styles.page}>
      <div className={styles.section}>
        <h1 className={styles.sectionTitle}>Tutor not found</h1>
        <p className={styles.bodyText}>
          The tutor profile you are looking for does not exist or is not publicly listed.
        </p>
        <div style={{ marginTop: 'var(--space-5)', display: 'flex', gap: 'var(--space-3)' }}>
          <Link href="/match" className={styles.ctaPrimary}>
            Get matched
          </Link>
          <Link href="/" className={styles.ctaSecondary}>
            Back to {site.name}
          </Link>
        </div>
      </div>
    </article>
  );
}
