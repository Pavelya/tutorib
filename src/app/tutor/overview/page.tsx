import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { DateTime } from 'luxon';
import { Badge } from '@/components/Badge/Badge';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Panel } from '@/components/Panel/Panel';
import { PersonSummary } from '@/components/PersonSummary/PersonSummary';
import { site } from '@/lib/config/site';
import { getTutorOverview } from '@/modules/tutors/overview-service';
import type {
  TutorListingDisplayStatus,
  TutorNextActionDto,
  TutorReadinessGateDto,
  TutorReadinessGateStatus,
} from '@/modules/tutors/overview-dto';
import styles from './overview.module.css';

export const metadata: Metadata = {
  title: `Overview — ${site.name}`,
  robots: { index: false, follow: false },
};

export default async function TutorOverviewPage() {
  const result = await getTutorOverview();

  if (result.status === 'unauthenticated') {
    redirect('/auth/sign-in');
  }
  if (result.status === 'forbidden') {
    notFound();
  }

  const { overview } = result;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>
          Welcome back, {overview.tutor.display_name}
        </h1>
        <p className={styles.subheading}>
          What needs your attention now — requests, upcoming lessons, and
          listing readiness.
        </p>
      </header>

      <section aria-labelledby="overview-metrics">
        <h2 id="overview-metrics" className={styles.sectionHeading}>
          At a glance
        </h2>
        <div className={styles.metricGrid}>
          <MetricTile
            label="Pending requests"
            value={overview.metrics.pending_requests_count}
          />
          <MetricTile
            label="Upcoming lessons"
            value={overview.metrics.upcoming_lessons_count}
          />
          <MetricTile
            label="Open issues"
            value={overview.metrics.open_issues_count}
          />
        </div>
      </section>

      <section aria-labelledby="overview-next-actions">
        <h2 id="overview-next-actions" className={styles.sectionHeading}>
          Next actions
        </h2>
        {overview.next_actions.length === 0 ? (
          <Panel variant="default">
            <EmptyState
              heading="Nothing waiting on you"
              description="You're all caught up. New booking requests and upcoming lessons will appear here."
            />
          </Panel>
        ) : (
          <ul className={styles.nextActionList}>
            {overview.next_actions.map((action) => (
              <li key={action.lesson_id}>
                <NextActionCard action={action} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="overview-readiness">
        <h2 id="overview-readiness" className={styles.sectionHeading}>
          Listing readiness
        </h2>
        <Panel variant="default" className={styles.readinessPanel}>
          <div className={styles.readinessHeader}>
            <Badge variant={listingBadgeVariant(overview.readiness.listing_status)}>
              {listingStatusLabel[overview.readiness.listing_status]}
            </Badge>
            <span className={styles.readinessMessage}>
              {overview.readiness.listing_message}
            </span>
          </div>

          <ul className={styles.gateList}>
            {overview.readiness.gates.map((gate) => (
              <li key={gate.gate}>
                <GateRow gate={gate} />
              </li>
            ))}
          </ul>
        </Panel>
      </section>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: number }) {
  return (
    <Panel variant="soft" className={styles.metricTile}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
    </Panel>
  );
}

function NextActionCard({ action }: { action: TutorNextActionDto }) {
  const subjectLine = buildSubjectLine(
    action.subject_snapshot,
    action.focus_snapshot,
  );
  const { kind, student } = action;
  const kindMeta = nextActionKindMeta[kind];

  return (
    <Panel variant="default" className={styles.nextActionCard}>
      <div className={styles.nextActionTopRow}>
        <Badge variant={kindMeta.variant}>{kindMeta.label}</Badge>
        <span className={styles.nextActionUrgency}>{action.urgency_label}</span>
      </div>

      <PersonSummary
        variant="compact"
        name={student.display_name}
        avatarSrc={student.avatar_url ?? undefined}
        descriptor={subjectLine}
      />

      <div className={styles.nextActionContext}>
        <time
          className={styles.nextActionDateTime}
          dateTime={action.scheduled_start_at}
        >
          {formatLessonWindow(
            action.scheduled_start_at,
            action.scheduled_end_at,
            action.lesson_timezone,
          )}
        </time>
      </div>
    </Panel>
  );
}

function GateRow({ gate }: { gate: TutorReadinessGateDto }) {
  const meta = gateStatusMeta[gate.status];
  return (
    <div className={styles.gateRow}>
      <div className={styles.gateHead}>
        <span className={styles.gateLabel}>{gate.label}</span>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>
      {gate.hint && <span className={styles.gateHint}>{gate.hint}</span>}
    </div>
  );
}

type BadgeVariant = 'positive' | 'warning' | 'destructive' | 'trust' | 'info';

const nextActionKindMeta: Record<
  TutorNextActionDto['kind'],
  { label: string; variant: BadgeVariant }
> = {
  pending_request: { label: 'New request', variant: 'warning' },
  upcoming_lesson: { label: 'Upcoming', variant: 'positive' },
  open_issue: { label: 'Issue reported', variant: 'destructive' },
};

const gateStatusMeta: Record<
  TutorReadinessGateStatus,
  { label: string; variant: BadgeVariant }
> = {
  complete: { label: 'Complete', variant: 'positive' },
  in_progress: { label: 'In progress', variant: 'warning' },
  under_review: { label: 'Under review', variant: 'info' },
  not_started: { label: 'Not started', variant: 'warning' },
  blocked: { label: 'Needs attention', variant: 'destructive' },
};

const listingStatusLabel: Record<TutorListingDisplayStatus, string> = {
  not_listed: 'Not listed',
  eligible: 'Going live',
  listed: 'Listed',
  paused: 'Paused',
  delisted: 'Delisted',
};

function listingBadgeVariant(status: TutorListingDisplayStatus): BadgeVariant {
  switch (status) {
    case 'listed':
      return 'positive';
    case 'eligible':
      return 'trust';
    case 'paused':
      return 'warning';
    case 'delisted':
      return 'destructive';
    default:
      return 'warning';
  }
}

function buildSubjectLine(
  subject: string | null,
  focus: string | null,
): string {
  if (subject && focus) return `${subject} · ${focus}`;
  return subject ?? focus ?? 'Lesson';
}

function formatLessonWindow(
  startIso: string,
  endIso: string,
  timezone: string,
): string {
  const start = DateTime.fromISO(startIso, { zone: timezone });
  const end = DateTime.fromISO(endIso, { zone: timezone });
  if (!start.isValid || !end.isValid) return '';
  const startLabel = start.toFormat('ccc, LLL d · h:mm a');
  const endLabel = end.toFormat('h:mm a');
  return `${startLabel}–${endLabel} (${start.offsetNameShort ?? timezone})`;
}
