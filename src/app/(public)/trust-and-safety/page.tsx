import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/lib/config/site';
import { buildCanonicalUrl } from '@/lib/seo/metadata/canonical';
import { buildWebPage } from '@/lib/seo/schema/webpage';
import { buildBreadcrumbList } from '@/lib/seo/schema/breadcrumb';
import { JsonLd } from '@/lib/seo/schema/json-ld';
import styles from './trust-and-safety.module.css';

const PAGE_TITLE = `How ${site.name} Reviews Tutors, Safety, and Student Fit`;
const PAGE_DESCRIPTION =
  'Learn how Mentor IB screens and reviews tutors, handles safety and reporting, and maintains high standards for student fit and trust.';
const PAGE_PATH = '/trust-and-safety';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: buildCanonicalUrl(PAGE_PATH),
  },
};

export default function TrustAndSafetyPage() {
  return (
    <article className={styles.page}>
      <JsonLd
        data={buildWebPage({
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          pathname: PAGE_PATH,
        })}
      />
      <JsonLd
        data={buildBreadcrumbList([
          { name: 'Home', pathname: '/' },
          { name: 'Trust & Safety', pathname: PAGE_PATH },
        ])}
      />

      <header className={styles.hero}>
        <h1>Trust &amp; Safety</h1>
        <p>
          {site.name} is built so students and parents can trust every tutor on
          the platform. Here is how we review tutors, maintain safety, and
          protect students.
        </p>
      </header>

      <section className={styles.section}>
        <h2>Tutor Review and Approval</h2>
        <p>
          Every tutor on {site.name} goes through an application and review
          process before they can accept bookings. We do not run an open
          marketplace — tutors are approved individually.
        </p>
        <ul className={styles.trustList}>
          <li>
            Tutors submit their qualifications, IB subject expertise, and
            teaching experience as part of their application.
          </li>
          <li>
            Applications are reviewed against our standards for subject
            knowledge, teaching ability, and professional conduct.
          </li>
          <li>
            Only tutors who meet these standards are approved to appear in
            student matches and accept bookings.
          </li>
          <li>
            Tutor listings require a complete profile, verified schedule, and
            active payout setup before going live.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Student Safety</h2>
        <p>
          Student safety is a core design requirement, not an add-on feature.
          {site.name} is built with safety considerations at every layer.
        </p>
        <ul className={styles.trustList}>
          <li>
            All communication between students and tutors happens through the
            {' '}{site.name} messaging system, keeping conversations on-platform and
            auditable.
          </li>
          <li>
            Students and parents can report concerns about any tutor or session
            directly from the platform.
          </li>
          <li>
            Reports are reviewed and acted on. Tutors who violate platform
            standards face suspension or removal.
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>Reporting and Moderation</h2>
        <p>
          If something does not feel right — a session, a message, or a
          tutor&apos;s conduct — you can report it. Reports are taken seriously and reviewed
          by our team.
        </p>
        <p>
          We act on reports with appropriate measures: warnings, temporary
          suspension, or permanent removal depending on the severity and nature
          of the issue.
        </p>
      </section>

      <section className={styles.commitmentPanel}>
        <h2>Our Commitment</h2>
        <p>
          {site.name} exists to connect students with strong IB tutors in a safe,
          trustworthy environment. We review every tutor, monitor the platform
          for quality, and respond to concerns quickly.
        </p>
        <p>
          If you have a question about safety or trust, reach out through our{' '}
          <Link href="/support">support page</Link>.
        </p>
      </section>

      <section className={styles.ctaSection}>
        <p>
          Ready to find a reviewed, qualified IB tutor?
        </p>
        <Link href="/match" className={styles.ctaLink}>
          Start Matching
        </Link>
      </section>
    </article>
  );
}
