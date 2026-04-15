import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/lib/config/site';
import { buildCanonicalUrl } from '@/lib/seo/metadata/canonical';
import { buildWebPage } from '@/lib/seo/schema/webpage';
import { buildBreadcrumbList } from '@/lib/seo/schema/breadcrumb';
import { JsonLd } from '@/lib/seo/schema/json-ld';
import styles from './how-it-works.module.css';

const PAGE_TITLE = `How ${site.name} Matching Works for Students and Parents`;
const PAGE_DESCRIPTION =
  'Learn how Mentor IB matches students with qualified IB tutors — from describing your learning need through to selecting the right tutor and booking your first session.';
const PAGE_PATH = '/how-it-works';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: buildCanonicalUrl(PAGE_PATH),
  },
};

export default function HowItWorksPage() {
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
          { name: 'How It Works', pathname: PAGE_PATH },
        ])}
      />

      <header className={styles.hero}>
        <h1>How {site.name} Works</h1>
        <p>
          {site.name} matches you with an IB tutor based on your specific
          learning needs — not a generic search. Here is how the process works
          from start to first session.
        </p>
      </header>

      <section className={styles.stepsSection}>
        <h2>From Need to First Session</h2>

        <div className={styles.step}>
          <span className={styles.stepNumber}>1</span>
          <div className={styles.stepContent}>
            <h3>Describe Your Learning Need</h3>
            <p>
              Tell us what you need help with — your IB subjects, the kind of
              support you are looking for (exam preparation, IA feedback, essay
              review, concept clarity), and any preferences that matter to you.
              This takes a few minutes and shapes everything that follows.
            </p>
          </div>
        </div>

        <div className={styles.step}>
          <span className={styles.stepNumber}>2</span>
          <div className={styles.stepContent}>
            <h3>Review Your Matches</h3>
            <p>
              {site.name} finds tutors who are genuinely strong for your specific
              need. Each match includes a fit explanation — not just a list of
              names. You can compare tutors side by side and see why each one was
              recommended.
            </p>
          </div>
        </div>

        <div className={styles.step}>
          <span className={styles.stepNumber}>3</span>
          <div className={styles.stepContent}>
            <h3>Choose Your Tutor</h3>
            <p>
              Review tutor profiles, read about their experience and teaching
              approach, and check their availability. Every tutor on {site.name}{' '}
              has been reviewed and approved before students can book with them.
            </p>
          </div>
        </div>

        <div className={styles.step}>
          <span className={styles.stepNumber}>4</span>
          <div className={styles.stepContent}>
            <h3>Book Your First Session</h3>
            <p>
              Pick a time that works, add a note about what you want to focus on,
              and submit your booking request. Your tutor confirms the session,
              and you are set. All times are shown in your local timezone so
              there is no confusion.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.whySection}>
        <h2>Why Matching, Not Browsing</h2>
        <ul className={styles.whyList}>
          <li>
            Most tutoring platforms show you a long list and leave you to figure
            out who is right. {site.name} starts with your need and works toward
            the right tutor.
          </li>
          <li>
            Fit explanations help you understand why a tutor was recommended —
            not just their qualifications, but how their strengths connect to
            what you need.
          </li>
          <li>
            Every tutor is reviewed before they can accept bookings. You are not
            browsing an open marketplace.
          </li>
        </ul>
      </section>

      <section className={styles.ctaSection}>
        <p>
          Ready to find the right IB tutor for your needs?
        </p>
        <Link href="/match" className={styles.ctaLink}>
          Start Matching
        </Link>
      </section>
    </article>
  );
}
