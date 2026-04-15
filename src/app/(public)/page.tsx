import Link from 'next/link';
import { site } from '@/lib/config/site';
import { buildRouteMetadata } from '@/lib/seo/metadata/build-metadata';
import { buildOrganization, buildWebSite } from '@/lib/seo/schema/organization';
import { JsonLd } from '@/lib/seo/schema/json-ld';
import { ContextChipRow } from '@/components/ContextChipRow/ContextChipRow';
import { resolveAccountState } from '@/modules/accounts/service';
import styles from './home.module.css';

const PAGE_TITLE = `Find Your IB Mentor — Matched to Your Need | ${site.name}`;
const PAGE_DESCRIPTION =
  'Move from a vague pressure point to a tutor who actually fits your IB situation. IA feedback, TOK structure, oral practice, HL exam rescue, weekly support — matched, not browsed.';
const PAGE_PATH = '/';

export const metadata = buildRouteMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  pathname: PAGE_PATH,
});

const NEED_CHIPS = [
  { label: 'IA feedback', tone: 'default' as const },
  { label: 'TOK essay', tone: 'default' as const },
  { label: 'IO practice', tone: 'default' as const },
  { label: 'EE planning', tone: 'default' as const },
  { label: 'HL exam rescue', tone: 'warm' as const },
  { label: 'Weekly support', tone: 'muted' as const },
];

export default async function HomePage() {
  const accountState = await resolveAccountState();
  const isSignedInStudent = accountState.status === 'student_active';

  return (
    <article className={styles.page}>
      <JsonLd data={buildOrganization()} />
      <JsonLd data={buildWebSite()} />

      {/* Signed-in student continuation state */}
      {isSignedInStudent && (
        <div className={styles.continuationBanner}>
          <div>
            <strong>Welcome back, {accountState.appUser.full_name?.split(' ')[0] ?? 'there'}</strong>
            <p>Pick up where you left off — find your next tutor or check your lessons.</p>
          </div>
          <div className={styles.actionRow}>
            <Link href="/match" className={styles.ctaLink}>Get matched</Link>
            <Link href="/lessons" className={styles.ctaSecondaryLink}>My lessons</Link>
          </div>
        </div>
      )}

      {/* Hero grid */}
      <div className={styles.heroGrid}>
        <section className={styles.heroCopy}>
          <div className={styles.eyebrow}>IB-native matching</div>
          <h1>
            IB help for the part that feels{' '}
            <span className={styles.serif}>hard</span> right now.
          </h1>
          <p>
            Move from a vague pressure point to a tutor who actually fits the
            situation: IA feedback, TOK structure, oral practice, HL exam rescue,
            weekly support.
          </p>
          <div className={styles.actionRow}>
            <Link href="/match" className={styles.ctaPrimary}>Get matched</Link>
            <Link href="/match" className={styles.ctaSecondary}>Browse by fit</Link>
          </div>
          <ContextChipRow chips={NEED_CHIPS} />
        </section>

        <section className={styles.proofCard}>
          <div>
            <div className={styles.sectionKicker}>Sample decision story</div>
            <h2>
              From &ldquo;I&rsquo;m stuck&rdquo; to a tutor who{' '}
              <span className={styles.serif}>fits</span>.
            </h2>
          </div>
          <div className={styles.proofSummaryBar}>
            <strong>Need</strong>
            <span className={styles.proofPill}>English A HL</span>
            <span className={styles.proofPill}>IA feedback</span>
            <span className={`${styles.proofPill} ${styles.urgent}`}>Urgent</span>
          </div>
          <div className={styles.studyNote}>
            <strong>Best-fit match surfaced first</strong>
            <p>
              &ldquo;Strong for English A HL written commentary and fast
              turnaround on IA structure and feedback.&rdquo;
            </p>
          </div>
          <div className={styles.studyNote}>
            <strong>Why this works</strong>
            <p>
              Clear fit reasons, next availability, proof of IB context, and one
              calm path to booking.
            </p>
          </div>
        </section>
      </div>

      {/* How matching works + Trust */}
      <div className={styles.splitBand}>
        <section className={styles.bandPanel}>
          <div className={styles.bandPanelKicker}>How matching works</div>
          <h3>Three calm steps, not a giant marketplace.</h3>
          <ol>
            <li>Tell us what part of IB feels difficult right now.</li>
            <li>
              See ranked fits with clear reasons and availability overlap.
            </li>
            <li>
              Book with confidence, message easily, and keep lesson context
              visible.
            </li>
          </ol>
        </section>
        <section className={styles.bandPanelWarm}>
          <div className={styles.bandPanelKicker}>Trust and reassurance</div>
          <h3>Built for careful decisions, not quick clicks.</h3>
          <ul>
            <li>IB-specific tutors and scenario-led fit language</li>
            <li>Visible trust proof and review context</li>
            <li>Timezone-aware booking and shared message continuity</li>
          </ul>
        </section>
      </div>

      {/* Sample matches */}
      <section className={styles.sampleSection}>
        <div className={styles.sampleHeader}>
          <div>
            <div className={styles.bandPanelKicker}>Sample matches</div>
            <h3>
              Proof that the discovery unit is a fit row, not a tutor card grid.
            </h3>
          </div>
          <Link href="/match" className={styles.ctaSecondary}>
            See results view
          </Link>
        </div>
        <div className={styles.matchRows}>
          <div className={styles.matchRow}>
            <div className={styles.matchPerson}>
              <h4>Ivan M.</h4>
              <p>
                English A, TOK, EE guidance
                <br />
                4.9 rating &middot; verified credentials
              </p>
              <ContextChipRow
                chips={[
                  { label: 'Best fit', tone: 'default' },
                  { label: '42 reviews', tone: 'muted' },
                ]}
              />
            </div>
            <div className={styles.matchFit}>
              Best for students who need{' '}
              <span className={styles.serif}>fast, clear</span> IA structure
              feedback. Strong written feedback language for English A HL and
              commentary planning.
            </div>
            <div className={styles.matchMetrics}>
              <div className={styles.metric}>
                <span>Next slot</span>
                <strong>Wed 18:30</strong>
              </div>
              <div className={styles.metric}>
                <span>Price</span>
                <strong>$48 / trial</strong>
              </div>
            </div>
          </div>
          <div className={styles.matchRow}>
            <div className={styles.matchPerson}>
              <h4>Alicia R.</h4>
              <p>
                TOK essay, oral prep, weekly support
                <br />
                4.8 rating &middot; strong review proof
              </p>
            </div>
            <div className={styles.matchFit}>
              Best for students who need{' '}
              <span className={styles.serif}>structured thinking</span> and calm
              explanation.
            </div>
            <div className={styles.matchMetrics}>
              <div className={styles.metric}>
                <span>Availability</span>
                <strong>Thu 16:00</strong>
              </div>
              <div className={styles.metric}>
                <span>Price</span>
                <strong>$52 / lesson</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust proof block */}
      <section className={styles.trustSection}>
        <div className={styles.bandPanelKicker}>Trust proof</div>
        <div className={styles.trustGrid}>
          <div className={styles.trustCard}>
            <strong>IB-specific context</strong>
            <p>
              Tutors are framed by the exact scenarios they solve, not generic
              subject labels alone.
            </p>
          </div>
          <div className={styles.trustCard}>
            <strong>Visible fit reasoning</strong>
            <p>
              Students can see why a tutor was surfaced before committing time to
              a profile.
            </p>
          </div>
          <div className={styles.trustCard}>
            <strong>Safe continuity</strong>
            <p>
              Booking, lessons, and messages preserve one shared context instead
              of splitting the journey.
            </p>
          </div>
        </div>
      </section>
    </article>
  );
}
