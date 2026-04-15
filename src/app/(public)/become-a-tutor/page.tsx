import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/lib/config/site';
import { buildCanonicalUrl } from '@/lib/seo/metadata/canonical';
import { buildWebPage } from '@/lib/seo/schema/webpage';
import { buildBreadcrumbList } from '@/lib/seo/schema/breadcrumb';
import { JsonLd } from '@/lib/seo/schema/json-ld';
import styles from './become-a-tutor.module.css';

const PAGE_TITLE = `Become an IB Tutor on ${site.name} | Standards, Fit, and Application`;
const PAGE_DESCRIPTION =
  'Apply to tutor IB students on Mentor IB. Learn who we are looking for, what our standards are, and how the application process works.';
const PAGE_PATH = '/become-a-tutor';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: {
    canonical: buildCanonicalUrl(PAGE_PATH),
  },
};

export default function BecomeATutorPage() {
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
          { name: 'Become a Tutor', pathname: PAGE_PATH },
        ])}
      />

      <header className={styles.hero}>
        <h1>Become an IB Tutor</h1>
        <p>
          {site.name} connects strong IB tutors with students who need specific,
          high-quality help. If you have real IB expertise and care about
          teaching well, we want to hear from you.
        </p>
      </header>

      <section className={styles.section}>
        <h2>Why Teach on {site.name}</h2>
        <ul className={styles.benefitsList}>
          <li>
            Students are matched to you based on fit — not price ranking. Your
            strengths matter more than your position in a list.
          </li>
          <li>
            You work with students who actually need what you offer. The matching
            system connects you with students whose learning needs align with
            your expertise.
          </li>
          <li>
            Reliable payment through Stripe. You set your rate, receive bookings,
            and get paid — no chasing invoices.
          </li>
          <li>
            One platform for scheduling, messaging, and session management. No
            juggling separate tools.
          </li>
        </ul>
      </section>

      <div className={styles.standardsPanel}>
        <h2>Who Should Apply</h2>
        <p>
          {site.name} is not an open marketplace. We review every application and
          approve tutors individually. We are looking for tutors who have:
        </p>
        <ul className={styles.benefitsList}>
          <li>
            Strong IB subject expertise — either as a former IB student with
            excellent results, an IB teacher, or a subject specialist with
            demonstrated IB knowledge.
          </li>
          <li>
            Real teaching ability — you can explain concepts clearly, adapt to
            different learners, and help students build genuine understanding.
          </li>
          <li>
            Professional reliability — you show up prepared, communicate
            clearly, and treat tutoring as a real commitment.
          </li>
        </ul>
        <p>
          If you are not sure whether you qualify, apply and we will let you know.
          We would rather review a strong application than have a good tutor
          never apply.
        </p>
      </div>

      <section className={styles.section}>
        <h2>How the Application Works</h2>
        <ol className={styles.processSteps}>
          <li className={styles.processStep}>
            <p>
              <strong>Submit your application.</strong> Tell us about your IB
              background, subjects you teach, and your approach to tutoring.
            </p>
          </li>
          <li className={styles.processStep}>
            <p>
              <strong>We review your application.</strong> Our team evaluates your
              qualifications, experience, and fit for the platform.
            </p>
          </li>
          <li className={styles.processStep}>
            <p>
              <strong>Complete your profile.</strong> Once approved, set up your
              tutor profile, schedule, meeting link, and payout information.
            </p>
          </li>
          <li className={styles.processStep}>
            <p>
              <strong>Go live.</strong> When your profile is complete and
              verified, students can find you through matching and book sessions.
            </p>
          </li>
        </ol>
      </section>

      <section className={styles.faqSection}>
        <h2>Common Questions</h2>

        <div className={styles.faqItem}>
          <h3>How long does the review take?</h3>
          <p>
            Most applications are reviewed within a few business days. We will
            contact you if we need additional information.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h3>Do I set my own rates?</h3>
          <p>
            Yes. You set your hourly rate and can adjust it at any time. Students
            see your rate as part of the matching and booking process.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h3>Can I tutor part-time?</h3>
          <p>
            Absolutely. You control your schedule and availability. Many tutors
            on {site.name} tutor alongside other commitments.
          </p>
        </div>

        <div className={styles.faqItem}>
          <h3>What if I teach subjects outside the IB?</h3>
          <p>
            {site.name} is focused on the International Baccalaureate. If your
            expertise is primarily outside the IB programme, this may not be the
            right platform for now.
          </p>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <h2>Ready to Apply?</h2>
        <p>
          If you have real IB expertise and want to tutor students who need
          it, start your application.
        </p>
        <Link href="/tutor/apply" className={styles.ctaLink}>
          Apply Now
        </Link>
        <br />
        <Link href="/how-it-works" className={styles.secondaryLink}>
          Learn more about how {site.name} works
        </Link>
      </section>
    </article>
  );
}
