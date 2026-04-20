import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { DateTime } from 'luxon';
import { Avatar } from '@/components/Avatar/Avatar';
import { Badge } from '@/components/Badge/Badge';
import { EmptyState } from '@/components/EmptyState/EmptyState';
import { Panel } from '@/components/Panel/Panel';
import { site } from '@/lib/config/site';
import { getTutorLessons } from '@/modules/lessons/service';
import type {
  TutorLessonCardDto,
  TutorLessonState,
} from '@/modules/lessons/dto';
import styles from './lessons.module.css';

export const metadata: Metadata = {
  title: `Lessons — ${site.name}`,
  robots: { index: false, follow: false },
};

export default async function TutorLessonsPage() {
  const result = await getTutorLessons();

  if (result.status === 'unauthenticated') {
    redirect('/auth/sign-in');
  }
  if (result.status === 'forbidden') {
    notFound();
  }

  const { lessons } = result;
  const groups = groupLessons(lessons);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Lessons</h1>
        <p className={styles.subheading}>
          Pending requests, upcoming lessons, and past sessions with your students.
        </p>
      </header>

      {lessons.length === 0 ? (
        <Panel variant="default">
          <EmptyState
            heading="No lessons yet"
            description="When students request lessons, they will appear here."
          />
        </Panel>
      ) : (
        <div className={styles.groups}>
          <LessonGroup
            heading="Pending requests"
            emptyHint="No requests waiting for your response."
            lessons={groups.pending}
          />
          <LessonGroup
            heading="Upcoming"
            emptyHint="No upcoming lessons scheduled."
            lessons={groups.upcoming}
          />
          <LessonGroup heading="Past" emptyHint={null} lessons={groups.past} />
        </div>
      )}
    </div>
  );
}

function LessonGroup({
  heading,
  emptyHint,
  lessons,
}: {
  heading: string;
  emptyHint: string | null;
  lessons: TutorLessonCardDto[];
}) {
  if (lessons.length === 0 && emptyHint === null) return null;

  return (
    <section aria-labelledby={`group-${heading}`} className={styles.group}>
      <h2 id={`group-${heading}`} className={styles.groupHeading}>
        {heading}
      </h2>
      {lessons.length === 0 ? (
        <Panel variant="soft" className={styles.emptyHintPanel}>
          <p className={styles.emptyHint}>{emptyHint}</p>
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
    </section>
  );
}

function LessonCard({ lesson }: { lesson: TutorLessonCardDto }) {
  const { student } = lesson;
  const subjectLine = buildSubjectLine(
    lesson.subject_snapshot,
    lesson.focus_snapshot,
  );
  const stateInfo = stateDisplayMap[lesson.lesson_state];
  const expiryHint = buildExpiryHint(lesson);

  return (
    <Link
      href={`/tutor/lessons/${lesson.lesson_id}`}
      className={styles.cardLink}
      aria-label={`${subjectLine} with ${student.display_name}, ${stateInfo.label}`}
    >
      <Panel variant="default" className={styles.card}>
        <div className={styles.cardStatusRow}>
          <Badge variant={stateInfo.variant}>{stateInfo.label}</Badge>
          {lesson.has_open_issue && (
            <Badge variant="warning">Issue reported</Badge>
          )}
          {expiryHint && (
            <span className={styles.expiryHint}>{expiryHint}</span>
          )}
        </div>

        <div className={styles.cardPerson}>
          <Avatar
            size="md"
            name={student.display_name}
            src={student.avatar_url ?? undefined}
          />
          <div className={styles.cardPersonBody}>
            <span className={styles.cardPersonName}>{student.display_name}</span>
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
        </div>
      </Panel>
    </Link>
  );
}

interface LessonGroups {
  pending: TutorLessonCardDto[];
  upcoming: TutorLessonCardDto[];
  past: TutorLessonCardDto[];
}

function groupLessons(lessons: TutorLessonCardDto[]): LessonGroups {
  const pending: TutorLessonCardDto[] = [];
  const upcoming: TutorLessonCardDto[] = [];
  const past: TutorLessonCardDto[] = [];

  for (const lesson of lessons) {
    if (lesson.lesson_state === 'requested') pending.push(lesson);
    else if (lesson.lesson_state === 'upcoming') upcoming.push(lesson);
    else past.push(lesson);
  }

  // Pending first by request expiry urgency (soonest expiry first), upcoming
  // by start time ascending, past stays in default scheduled-desc order.
  pending.sort((a, b) => {
    const aExp = a.request_expires_at ?? a.scheduled_start_at;
    const bExp = b.request_expires_at ?? b.scheduled_start_at;
    return aExp.localeCompare(bExp);
  });
  upcoming.sort((a, b) => a.scheduled_start_at.localeCompare(b.scheduled_start_at));

  return { pending, upcoming, past };
}

function buildExpiryHint(lesson: TutorLessonCardDto): string | null {
  if (lesson.lesson_state !== 'requested' || !lesson.request_expires_at) {
    return null;
  }
  const expiry = DateTime.fromISO(lesson.request_expires_at);
  if (!expiry.isValid) return null;
  const hours = expiry.diff(DateTime.utc(), 'hours').hours;
  if (hours <= 0) return 'Expiring now';
  if (hours < 1) return `Respond within ${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `Respond within ${Math.round(hours)}h`;
  return `Respond within ${Math.round(hours / 24)}d`;
}

const stateDisplayMap: Record<
  TutorLessonState,
  { label: string; variant: 'positive' | 'warning' | 'destructive' | 'info' }
> = {
  requested: { label: 'Pending', variant: 'warning' },
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
