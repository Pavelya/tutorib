import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DateTime } from 'luxon';
import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Panel } from '@/components/Panel/Panel';
import { site } from '@/lib/config/site';
import { getStudentLessons } from '@/modules/lessons/service';
import type {
  StudentLessonCardDto,
  StudentLessonState,
} from '@/modules/lessons/dto';
import styles from './lessons.module.css';

export const metadata: Metadata = {
  title: `Lessons — ${site.name}`,
  robots: { index: false, follow: false },
};

export default async function StudentLessonsPage() {
  const result = await getStudentLessons();

  if (result.status === 'unauthenticated') {
    redirect('/auth/sign-in');
  }
  if (result.status === 'forbidden') {
    notFound();
  }

  const { lessons } = result;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Lessons</h1>
        <p className={styles.subheading}>
          Requested, upcoming, and past lessons with tutors you&apos;ve matched with.
        </p>
      </header>

      {lessons.length === 0 ? (
        <Panel variant="default">
          <EmptyState
            heading="No lessons yet"
            description="Once you request a lesson from a match, it will show up here."
          />
        </Panel>
      ) : (
        <ul className={styles.list}>
          {lessons.map((lesson) => (
            <li key={lesson.lesson_id}>
              <LessonCard lesson={lesson} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LessonCard({ lesson }: { lesson: StudentLessonCardDto }) {
  const { tutor } = lesson;
  const subjectLine = buildSubjectLine(
    lesson.subject_snapshot,
    lesson.focus_snapshot,
  );
  const priceLine = buildPriceLine(lesson.price_amount, lesson.currency_code);
  const stateInfo = stateDisplayMap[lesson.lesson_state];

  return (
    <Link
      href={`/lessons/${lesson.lesson_id}`}
      className={styles.cardLink}
      aria-label={`${subjectLine} with ${tutor.display_name}, ${stateInfo.label}`}
    >
      <Panel variant="default" className={styles.card}>
        <div className={styles.cardStatusRow}>
          <Badge variant={stateInfo.variant}>{stateInfo.label}</Badge>
          {lesson.has_open_issue && (
            <Badge variant="warning">Issue reported</Badge>
          )}
        </div>

        <div className={styles.cardPerson}>
          <Avatar
            size="md"
            name={tutor.display_name}
            src={tutor.avatar_url ?? undefined}
          />
          <div className={styles.cardPersonBody}>
            <span className={styles.cardPersonName}>{tutor.display_name}</span>
            {tutor.headline && (
              <span className={styles.cardPersonHeadline}>{tutor.headline}</span>
            )}
          </div>
        </div>

        <div className={styles.cardContext}>
          <span className={styles.cardSubject}>{subjectLine}</span>
          <time
            className={styles.cardDatetime}
            dateTime={lesson.scheduled_start_at}
          >
            {formatLessonWindow(
              lesson.scheduled_start_at,
              lesson.scheduled_end_at,
              lesson.lesson_timezone,
            )}
          </time>
          {priceLine && <span className={styles.cardPrice}>{priceLine}</span>}
        </div>
      </Panel>
    </Link>
  );
}

const stateDisplayMap: Record<
  StudentLessonState,
  { label: string; variant: 'positive' | 'warning' | 'destructive' | 'info' }
> = {
  requested: { label: 'Requested', variant: 'warning' },
  upcoming: { label: 'Upcoming', variant: 'positive' },
  completed: { label: 'Completed', variant: 'info' },
  declined: { label: 'Declined', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
  expired: { label: 'Expired', variant: 'destructive' },
};

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
  const startLabel = start.toFormat('ccc, LLL d · h:mm a');
  const endLabel = end.toFormat('h:mm a');
  return `${startLabel}–${endLabel} (${start.offsetNameShort ?? timezone})`;
}
