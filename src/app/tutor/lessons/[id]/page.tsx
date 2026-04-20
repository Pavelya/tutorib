import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DateTime } from 'luxon';
import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import { InlineNotice } from '@/components/InlineNotice/InlineNotice';
import { Panel } from '@/components/Panel/Panel';
import { site } from '@/lib/config/site';
import { getTutorLessonDetail } from '@/modules/lessons/service';
import type {
  LessonIssueStatusDto,
  LessonMeetingAccessDto,
  TutorLessonDetailDto,
  TutorLessonState,
} from '@/modules/lessons/dto';
import { TutorRequestActions } from './LessonActions';
import styles from './lesson-detail.module.css';

export const metadata: Metadata = {
  title: `Lesson — ${site.name}`,
  robots: { index: false, follow: false },
};

interface TutorLessonDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function TutorLessonDetailPage({
  params,
}: TutorLessonDetailPageProps) {
  const { id } = await params;

  const result = await getTutorLessonDetail(id);

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
        <Link href="/tutor/lessons" className={styles.backLink}>
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
            name={lesson.student.display_name}
            src={lesson.student.avatar_url ?? undefined}
          />
          <div className={styles.tutorBody}>
            <span className={styles.tutorName}>
              {lesson.student.display_name}
            </span>
            {lesson.student.timezone && (
              <span className={styles.tutorHeadline}>
                Student timezone: {lesson.student.timezone}
              </span>
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
            <dt className={styles.factLabel}>Lesson timezone</dt>
            <dd className={styles.factValue}>{lesson.lesson_timezone}</dd>
          </div>
          {lesson.lesson_state === 'requested' && lesson.request_expires_at && (
            <div className={styles.fact}>
              <dt className={styles.factLabel}>Respond before</dt>
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
          <h2 className={styles.sectionHeading}>Note from the student</h2>
          <p className={styles.note}>{lesson.student_note_snapshot}</p>
        </Panel>
      )}

      {lesson.lesson_state === 'requested' &&
        (lesson.can_accept || lesson.can_decline) && (
          <Panel variant="default" className={styles.section}>
            <h2 className={styles.sectionHeading}>Respond to request</h2>
            <TutorRequestActions
              lessonId={lesson.lesson_id}
              priceLine={priceLine}
            />
          </Panel>
        )}

      {lesson.lesson_state === 'upcoming' && (
        <Panel variant="default" className={styles.section}>
          <h2 className={styles.sectionHeading}>Meeting link</h2>
          <MeetingSection meeting={lesson.meeting_access} />
        </Panel>
      )}

      {lesson.issue && (
        <Panel variant="default" className={styles.section}>
          <h2 className={styles.sectionHeading}>Issue</h2>
          <IssueStatus issue={lesson.issue} />
        </Panel>
      )}
    </div>
  );
}

function MeetingSection({ meeting }: { meeting: LessonMeetingAccessDto | null }) {
  if (!meeting || !meeting.join_url || meeting.access_status !== 'active') {
    return (
      <InlineNotice variant="info">
        <strong>Meeting link not yet set</strong>
        <p>
          Share a meeting link from your schedule defaults so the student can
          join at the scheduled time.
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
        Open meeting
      </a>
      <span className={styles.providerLabel}>via {meeting.provider_label}</span>
    </div>
  );
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

const stateDisplayMap: Record<
  TutorLessonState,
  {
    label: string;
    variant: 'positive' | 'warning' | 'destructive' | 'info';
    helper: string;
  }
> = {
  requested: {
    label: 'Pending',
    variant: 'warning',
    helper:
      'A student is waiting for your response. Accepting captures the held payment; declining releases it.',
  },
  upcoming: {
    label: 'Upcoming',
    variant: 'positive',
    helper:
      'You accepted this request. Join through the meeting link at the scheduled time.',
  },
  completed: {
    label: 'Completed',
    variant: 'info',
    helper: 'This lesson has ended.',
  },
  declined: {
    label: 'Declined',
    variant: 'destructive',
    helper: 'You declined this request. The payment authorization was released.',
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
      'The request expired before it was answered. The payment authorization was released automatically.',
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
        heading: 'Issue reported by the student',
        body: 'Trust & safety has the report. You will be contacted if more information is needed.',
      };
    case 'under_review':
      return {
        heading: 'Issue under review',
        body: 'This report is being reviewed. The outcome will appear here.',
      };
    case 'resolved':
      return {
        heading: 'Issue resolved',
        body: 'A resolution has been recorded for this lesson issue.',
      };
    case 'dismissed':
      return {
        heading: 'Issue dismissed',
        body: 'This report was dismissed.',
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
