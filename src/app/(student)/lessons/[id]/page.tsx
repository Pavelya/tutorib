import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DateTime } from 'luxon';
import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import { InlineNotice } from '@/components/InlineNotice/InlineNotice';
import { Panel } from '@/components/Panel/Panel';
import { site } from '@/lib/config/site';
import {
  buildGoogleCalendarLink,
  getStudentLessonDetail,
} from '@/modules/lessons/service';
import type {
  LessonIssueStatusDto,
  LessonMeetingAccessDto,
  StudentLessonDetailDto,
  StudentLessonState,
} from '@/modules/lessons/dto';
import { CancelLessonForm, ReportIssueForm } from './LessonActions';
import styles from './lesson-detail.module.css';

export const metadata: Metadata = {
  title: `Lesson — ${site.name}`,
  robots: { index: false, follow: false },
};

interface LessonDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentLessonDetailPage({
  params,
}: LessonDetailPageProps) {
  const { id } = await params;

  const result = await getStudentLessonDetail(id);

  if (result.status === 'unauthenticated') {
    redirect('/auth/sign-in');
  }
  if (result.status === 'forbidden' || result.status === 'not_found') {
    notFound();
  }

  const { lesson } = result;
  const stateInfo = stateDisplayMap[lesson.lesson_state];
  const subjectLine = buildSubjectLine(
    lesson.subject_snapshot,
    lesson.focus_snapshot,
  );
  const priceLine = buildPriceLine(lesson.price_amount, lesson.currency_code);

  return (
    <div className={styles.page}>
      <div className={styles.backRow}>
        <Link href="/lessons" className={styles.backLink}>
          ← All lessons
        </Link>
      </div>

      <Panel variant="default" className={styles.headerPanel}>
        <div className={styles.statusRow}>
          <Badge variant={stateInfo.variant}>{stateInfo.label}</Badge>
          {lesson.issue && (
            <Badge variant={issueBadgeVariant(lesson.issue.case_status)}>
              {issueBadgeLabel(lesson.issue)}
            </Badge>
          )}
        </div>

        <h1 className={styles.heading}>{subjectLine}</h1>

        <div className={styles.tutorRow}>
          <Avatar
            size="lg"
            name={lesson.tutor.display_name}
            src={lesson.tutor.avatar_url ?? undefined}
          />
          <div className={styles.tutorBody}>
            <span className={styles.tutorName}>{lesson.tutor.display_name}</span>
            {lesson.tutor.headline && (
              <span className={styles.tutorHeadline}>
                {lesson.tutor.headline}
              </span>
            )}
            {lesson.tutor.public_slug && (
              <Link
                href={`/tutors/${lesson.tutor.public_slug}`}
                className={styles.tutorLink}
              >
                View profile
              </Link>
            )}
          </div>
        </div>
      </Panel>

      <Panel variant="default" className={styles.section}>
        <h2 className={styles.sectionHeading}>When</h2>
        <dl className={styles.factGrid}>
          <div className={styles.fact}>
            <dt className={styles.factLabel}>Scheduled</dt>
            <dd className={styles.factValue}>
              <time dateTime={lesson.scheduled_start_at}>
                {formatLessonWindow(
                  lesson.scheduled_start_at,
                  lesson.scheduled_end_at,
                  lesson.lesson_timezone,
                )}
              </time>
            </dd>
          </div>
          <div className={styles.fact}>
            <dt className={styles.factLabel}>Timezone</dt>
            <dd className={styles.factValue}>{lesson.lesson_timezone}</dd>
          </div>
          {lesson.lesson_state === 'requested' && lesson.request_expires_at && (
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Tutor response deadline</dt>
              <dd className={styles.factValue}>
                <time dateTime={lesson.request_expires_at}>
                  {formatPointInTime(
                    lesson.request_expires_at,
                    lesson.lesson_timezone,
                  )}
                </time>
              </dd>
            </div>
          )}
          {priceLine && (
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Authorized amount</dt>
              <dd className={styles.factValue}>{priceLine}</dd>
            </div>
          )}
        </dl>
        <p className={styles.stateHelp}>{stateInfo.helper}</p>
      </Panel>

      {lesson.student_note_snapshot && (
        <Panel variant="default" className={styles.section}>
          <h2 className={styles.sectionHeading}>Your note to the tutor</h2>
          <p className={styles.note}>{lesson.student_note_snapshot}</p>
        </Panel>
      )}

      {lesson.lesson_state === 'upcoming' && (
        <Panel variant="default" className={styles.section}>
          <h2 className={styles.sectionHeading}>Join the lesson</h2>
          <JoinSection meeting={lesson.meeting_access} />
        </Panel>
      )}

      {(lesson.lesson_state === 'requested' ||
        lesson.lesson_state === 'upcoming') && (
        <Panel variant="default" className={styles.section}>
          <h2 className={styles.sectionHeading}>Add to calendar</h2>
          <CalendarSection lesson={lesson} />
        </Panel>
      )}

      {(lesson.lesson_state === 'requested' ||
        lesson.lesson_state === 'upcoming') && (
        <Panel variant="default" className={styles.section}>
          <h2 className={styles.sectionHeading}>Cancel lesson</h2>
          <CancelLessonForm
            lessonId={lesson.lesson_id}
            policy={lesson.cancellation_policy}
            lessonState={lesson.lesson_state}
          />
        </Panel>
      )}

      <Panel variant="default" className={styles.section}>
        <h2 className={styles.sectionHeading}>Issue reporting</h2>
        <IssueSection lesson={lesson} />
      </Panel>
    </div>
  );
}

function JoinSection({ meeting }: { meeting: LessonMeetingAccessDto | null }) {
  if (!meeting || !meeting.join_url || meeting.access_status !== 'active') {
    return (
      <InlineNotice variant="info">
        <strong>Meeting link pending</strong>
        <p>
          Your tutor has not shared a meeting link yet. You will see the join
          button here as soon as it is available.
        </p>
      </InlineNotice>
    );
  }

  return (
    <div className={styles.joinRow}>
      <a
        href={meeting.join_url}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.joinButton}
      >
        Join lesson
      </a>
      <span className={styles.providerLabel}>via {meeting.provider_label}</span>
    </div>
  );
}

function CalendarSection({ lesson }: { lesson: StudentLessonDetailDto }) {
  const googleLink = buildGoogleCalendarLink({
    lessonId: lesson.lesson_id,
    scheduledStartAt: lesson.scheduled_start_at,
    scheduledEndAt: lesson.scheduled_end_at,
    subjectSnapshot: lesson.subject_snapshot,
    focusSnapshot: lesson.focus_snapshot,
    tutorDisplayName: lesson.tutor.display_name,
    meetingUrl:
      lesson.meeting_access?.access_status === 'active'
        ? lesson.meeting_access.join_url
        : null,
  });

  return (
    <div className={styles.calendarRow}>
      <a
        href={googleLink}
        target="_blank"
        rel="noopener noreferrer"
        className={styles.calendarLink}
      >
        Add to Google Calendar
      </a>
      <a
        href={`/api/calendar/lessons/${lesson.lesson_id}/ics`}
        className={styles.calendarLink}
      >
        Download .ics
      </a>
    </div>
  );
}

function IssueSection({ lesson }: { lesson: StudentLessonDetailDto }) {
  if (lesson.issue) {
    return <IssueStatus issue={lesson.issue} />;
  }

  if (!lesson.is_issue_reportable) {
    return (
      <InlineNotice variant="info">
        Issue reporting is available from the lesson start time until 24 hours
        after the scheduled end.
      </InlineNotice>
    );
  }

  return <ReportIssueForm lessonId={lesson.lesson_id} />;
}

function IssueStatus({ issue }: { issue: LessonIssueStatusDto }) {
  const label = issueStatusLabel(issue.case_status);
  return (
    <div className={styles.issueStatus}>
      <InlineNotice variant={issueNoticeVariant(issue.case_status)}>
        <strong>{label.heading}</strong>
        <p>{label.body}</p>
        {issue.reported_at && (
          <p className={styles.issueMeta}>
            Reported{' '}
            <time dateTime={issue.reported_at}>
              {formatPointInTime(issue.reported_at, 'UTC')}
            </time>
          </p>
        )}
      </InlineNotice>
    </div>
  );
}

// ---------------------------------------------------------------------------
// State + formatting helpers
// ---------------------------------------------------------------------------

const stateDisplayMap: Record<
  StudentLessonState,
  {
    label: string;
    variant: 'positive' | 'warning' | 'destructive' | 'info';
    helper: string;
  }
> = {
  requested: {
    label: 'Requested',
    variant: 'warning',
    helper:
      'Waiting for the tutor to accept your request. Payment is authorized but not yet captured.',
  },
  upcoming: {
    label: 'Upcoming',
    variant: 'positive',
    helper:
      'The tutor accepted this lesson. You will join through the meeting link at the scheduled time.',
  },
  completed: {
    label: 'Completed',
    variant: 'info',
    helper: 'This lesson has ended.',
  },
  declined: {
    label: 'Declined',
    variant: 'destructive',
    helper: 'The tutor declined this request. No payment was captured.',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'destructive',
    helper: 'This lesson was cancelled.',
  },
  expired: {
    label: 'Expired',
    variant: 'destructive',
    helper:
      'The tutor did not respond in time. Your payment authorization was released.',
  },
};

function issueBadgeLabel(issue: LessonIssueStatusDto): string {
  switch (issue.case_status) {
    case 'open':
      return 'Issue reported';
    case 'under_review':
      return 'Under review';
    case 'resolved':
      return 'Issue resolved';
    case 'dismissed':
      return 'Issue dismissed';
  }
}

function issueBadgeVariant(
  status: LessonIssueStatusDto['case_status'],
): 'positive' | 'warning' | 'destructive' | 'info' {
  if (status === 'resolved') return 'positive';
  if (status === 'dismissed') return 'info';
  return 'warning';
}

function issueNoticeVariant(
  status: LessonIssueStatusDto['case_status'],
): 'info' | 'warning' | 'success' | 'action-needed' {
  if (status === 'resolved') return 'success';
  if (status === 'dismissed') return 'info';
  if (status === 'under_review') return 'action-needed';
  return 'warning';
}

function issueStatusLabel(
  status: LessonIssueStatusDto['case_status'],
): { heading: string; body: string } {
  switch (status) {
    case 'open':
      return {
        heading: 'Issue reported',
        body: "We've received the report. Our team will follow up shortly.",
      };
    case 'under_review':
      return {
        heading: 'Issue under review',
        body: 'This report is being reviewed. You will be notified when a resolution is recorded.',
      };
    case 'resolved':
      return {
        heading: 'Issue resolved',
        body: 'A resolution has been recorded for this lesson issue.',
      };
    case 'dismissed':
      return {
        heading: 'Issue dismissed',
        body: 'This report was dismissed. If you have new information, please contact support.',
      };
  }
}

function buildSubjectLine(
  subject: string | null,
  focus: string | null,
): string {
  if (subject && focus) return `${subject} · ${focus}`;
  return subject ?? focus ?? 'Lesson';
}

function buildPriceLine(
  amount: string | null,
  currency: string | null,
): string | null {
  if (!amount) return null;
  return `${amount} ${currency ?? ''}`.trim();
}

function formatLessonWindow(
  startIso: string,
  endIso: string,
  timezone: string,
): string {
  const start = DateTime.fromISO(startIso, { zone: timezone });
  const end = DateTime.fromISO(endIso, { zone: timezone });
  if (!start.isValid || !end.isValid) return '';
  const startLabel = start.toFormat('cccc, LLL d · h:mm a');
  const endLabel = end.toFormat('h:mm a');
  return `${startLabel}–${endLabel} (${start.offsetNameShort ?? timezone})`;
}

function formatPointInTime(iso: string, timezone: string): string {
  const dt = DateTime.fromISO(iso, { zone: timezone });
  if (!dt.isValid) return '';
  return dt.toFormat('LLL d, yyyy · h:mm a');
}
