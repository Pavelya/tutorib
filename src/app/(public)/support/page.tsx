import type { Metadata } from 'next';
import { site } from '@/lib/config/site';
import { buildCanonicalUrl } from '@/lib/seo/metadata/canonical';
import { buildHelpPage } from '@/lib/seo/schema/help-page';
import { buildBreadcrumbList } from '@/lib/seo/schema/breadcrumb';
import { JsonLd } from '@/lib/seo/schema/json-ld';
import styles from './support.module.css';

const PAGE_TITLE = `${site.name} Support and Common Questions`;
const PAGE_DESCRIPTION =
  'Find answers to common questions about Mentor IB — booking sessions, matching with tutors, payments, cancellations, and getting help.';
const PAGE_PATH = '/support';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: buildCanonicalUrl(PAGE_PATH),
  },
};

export default function SupportPage() {
  return (
    <article className={styles.page}>
      <JsonLd
        data={buildHelpPage({
          name: PAGE_TITLE,
          description: PAGE_DESCRIPTION,
          pathname: PAGE_PATH,
        })}
      />
      <JsonLd
        data={buildBreadcrumbList([
          { name: 'Home', pathname: '/' },
          { name: 'Support', pathname: PAGE_PATH },
        ])}
      />

      <header className={styles.hero}>
        <h1>Support</h1>
        <p>
          Find answers to common questions about using {site.name} — whether you
          are a student, parent, or tutor.
        </p>
      </header>

      <nav className={styles.topicNav} aria-label="Support topics">
        <a href="#students" className={styles.topicPill}>For Students</a>
        <a href="#tutors" className={styles.topicPill}>For Tutors</a>
        <a href="#booking" className={styles.topicPill}>Booking &amp; Sessions</a>
        <a href="#payments" className={styles.topicPill}>Payments</a>
        <a href="#safety" className={styles.topicPill}>Safety &amp; Reporting</a>
      </nav>

      <section id="students" className={styles.topicSection}>
        <h2>For Students and Parents</h2>

        <div className={styles.questionBlock}>
          <h3>How does matching work?</h3>
          <p>
            You describe your learning need — subjects, type of help, and
            preferences — and {site.name} matches you with tutors who are
            genuinely strong for that specific need. Each match includes a fit
            explanation so you understand why a tutor was recommended.
          </p>
        </div>

        <div className={styles.questionBlock}>
          <h3>Can I choose my own tutor?</h3>
          <p>
            Yes. Matching is a recommendation, not a requirement. You can review
            tutor profiles, compare options, and choose the tutor you feel is the
            best fit before booking.
          </p>
        </div>

        <div className={styles.questionBlock}>
          <h3>What subjects are covered?</h3>
          <p>
            {site.name} focuses on the International Baccalaureate programme.
            Tutors cover IB subjects across groups 1 through 6, including both
            Higher Level and Standard Level. Coverage depends on available tutors
            in each subject area.
          </p>
        </div>
      </section>

      <section id="tutors" className={styles.topicSection}>
        <h2>For Tutors</h2>

        <div className={styles.questionBlock}>
          <h3>How do I apply to tutor on {site.name}?</h3>
          <p>
            Start by submitting an application through the tutor application
            page. You will provide information about your qualifications, IB
            experience, and teaching approach. Applications are reviewed and
            approved individually.
          </p>
        </div>

        <div className={styles.questionBlock}>
          <h3>What are the requirements?</h3>
          <p>
            Tutors need demonstrable IB subject expertise and teaching ability.
            We review each application for subject knowledge, experience, and
            professional standards. You will also need to set up your profile,
            schedule, and payout information before going live.
          </p>
        </div>
      </section>

      <section id="booking" className={styles.topicSection}>
        <h2>Booking and Sessions</h2>

        <div className={styles.questionBlock}>
          <h3>How far in advance do I need to book?</h3>
          <p>
            Sessions require at least 8 hours of advance notice. Available slots
            within 8 hours are not shown to ensure tutors have time to prepare.
          </p>
        </div>

        <div className={styles.questionBlock}>
          <h3>What happens after I book?</h3>
          <p>
            Your tutor receives the booking request and confirms it. Once
            confirmed, both you and the tutor receive session details including
            the meeting link. You can message your tutor through {site.name} to
            discuss session focus beforehand.
          </p>
        </div>

        <div className={styles.questionBlock}>
          <h3>Can I cancel or reschedule?</h3>
          <p>
            Cancellation and rescheduling policies are outlined during the
            booking process. We aim to be fair to both students and tutors — see
            the specific policy details when booking or managing a session.
          </p>
        </div>
      </section>

      <section id="payments" className={styles.topicSection}>
        <h2>Payments</h2>

        <div className={styles.questionBlock}>
          <h3>When am I charged?</h3>
          <p>
            Payment is authorized when you submit a booking request. The charge
            is captured only when the tutor accepts the booking. If the tutor
            declines or the request expires, no charge is made.
          </p>
        </div>

        <div className={styles.questionBlock}>
          <h3>How do tutor payouts work?</h3>
          <p>
            Tutors receive payouts through Stripe Connect. Payout setup is part
            of the tutor onboarding process. Earnings are tracked within the
            tutor dashboard.
          </p>
        </div>
      </section>

      <section id="safety" className={styles.topicSection}>
        <h2>Safety and Reporting</h2>

        <div className={styles.questionBlock}>
          <h3>How do I report a concern?</h3>
          <p>
            You can report concerns about a tutor, session, or message directly
            from the platform. Reports are reviewed by our team and acted on
            promptly. See our{' '}
            <a href="/trust-and-safety">Trust &amp; Safety</a> page for more
            details.
          </p>
        </div>
      </section>

      <section className={styles.escalationPanel}>
        <h2>Still Need Help?</h2>
        <p>
          If you cannot find the answer you need here, contact us directly and we
          will help.
        </p>
        <a href={`mailto:support@${site.domain}`} className={styles.emailLink}>
          support@{site.domain}
        </a>
      </section>
    </article>
  );
}
