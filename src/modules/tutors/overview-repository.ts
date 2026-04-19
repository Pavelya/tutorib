import { and, asc, eq, gte, isNull, or, sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { tutorProfiles } from './schema';
import { lessons, lessonIssueCases } from '@/modules/lessons/schema';
import { availabilityRules } from '@/modules/availability/schema';
import { appUsers, studentProfiles } from '@/modules/accounts/schema';

// ---------------------------------------------------------------------------
// Internal row types — D0, never exported to routes or client components.
// Tutor-overview-scoped projections. Kept narrow so the overview does not
// pull counterparty-private or admin-only fields.
// ---------------------------------------------------------------------------

export interface TutorOwnIdentityRow {
  tutor_profile_id: string;
  display_name: string | null;
  headline: string | null;
  profile_visibility_status: string;
  application_status: string;
  public_listing_status: string;
  payout_readiness_status: string;
  account_status: string;
  timezone: string | null;
  full_name: string | null;
}

export async function findTutorIdentityByAppUserId(
  appUserId: string,
): Promise<TutorOwnIdentityRow | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      tutor_profile_id: tutorProfiles.id,
      display_name: tutorProfiles.display_name,
      headline: tutorProfiles.headline,
      profile_visibility_status: tutorProfiles.profile_visibility_status,
      application_status: tutorProfiles.application_status,
      public_listing_status: tutorProfiles.public_listing_status,
      payout_readiness_status: tutorProfiles.payout_readiness_status,
      account_status: appUsers.account_status,
      timezone: appUsers.timezone,
      full_name: appUsers.full_name,
    })
    .from(tutorProfiles)
    .innerJoin(appUsers, eq(appUsers.id, tutorProfiles.app_user_id))
    .where(eq(tutorProfiles.app_user_id, appUserId))
    .limit(1);
  return rows[0];
}

export async function countActiveAvailabilityRules(
  tutorProfileId: string,
): Promise<number> {
  const db = getDb();
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(availabilityRules)
    .where(
      and(
        eq(availabilityRules.tutor_profile_id, tutorProfileId),
        eq(availabilityRules.visibility_status, 'active'),
      ),
    );
  return rows[0]?.value ?? 0;
}

// ---------------------------------------------------------------------------
// Overview lesson projection — pending requests + upcoming lessons for the
// owning tutor. Participant-safe student summary only (display name + avatar).
// Detail fields (student note, meeting access, payment posture) are NOT
// included — those are owned by the tutor lessons route task.
// ---------------------------------------------------------------------------

export interface TutorOverviewLessonRow {
  lesson_id: string;
  lesson_status: string;
  scheduled_start_at: Date;
  scheduled_end_at: Date;
  request_expires_at: Date | null;
  lesson_timezone: string;
  subject_snapshot: string | null;
  focus_snapshot: string | null;
  student_display_name: string | null;
  student_full_name: string | null;
  student_avatar_url: string | null;
  has_open_issue: boolean;
}

export async function findTutorOverviewLessons(
  tutorProfileId: string,
  now: Date,
): Promise<TutorOverviewLessonRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      lesson_id: lessons.id,
      lesson_status: lessons.lesson_status,
      scheduled_start_at: lessons.scheduled_start_at,
      scheduled_end_at: lessons.scheduled_end_at,
      request_expires_at: lessons.request_expires_at,
      lesson_timezone: lessons.lesson_timezone,
      subject_snapshot: lessons.subject_snapshot,
      focus_snapshot: lessons.focus_snapshot,
      student_display_name: studentProfiles.display_name,
      student_full_name: appUsers.full_name,
      student_avatar_url: appUsers.avatar_url,
      issue_case_status: lessonIssueCases.case_status,
    })
    .from(lessons)
    .innerJoin(
      studentProfiles,
      eq(studentProfiles.id, lessons.student_profile_id),
    )
    .leftJoin(appUsers, eq(appUsers.id, studentProfiles.app_user_id))
    .leftJoin(
      lessonIssueCases,
      and(
        eq(lessonIssueCases.lesson_id, lessons.id),
        eq(lessonIssueCases.case_status, 'open'),
      ),
    )
    .where(
      and(
        eq(lessons.tutor_profile_id, tutorProfileId),
        or(
          // Pending requests that have not expired
          and(
            eq(lessons.lesson_status, 'requested'),
            or(
              isNull(lessons.request_expires_at),
              gte(lessons.request_expires_at, now),
            ),
          ),
          // Upcoming accepted lessons
          and(
            eq(lessons.lesson_status, 'accepted'),
            gte(lessons.scheduled_end_at, now),
          ),
        ),
      ),
    )
    .orderBy(asc(lessons.scheduled_start_at));

  return rows.map((r) => ({
    lesson_id: r.lesson_id,
    lesson_status: r.lesson_status,
    scheduled_start_at: r.scheduled_start_at,
    scheduled_end_at: r.scheduled_end_at,
    request_expires_at: r.request_expires_at,
    lesson_timezone: r.lesson_timezone,
    subject_snapshot: r.subject_snapshot,
    focus_snapshot: r.focus_snapshot,
    student_display_name: r.student_display_name,
    student_full_name: r.student_full_name,
    student_avatar_url: r.student_avatar_url,
    has_open_issue: r.issue_case_status !== null,
  }));
}

// ---------------------------------------------------------------------------
// Metric counters — tutor-scoped, narrow projections.
// ---------------------------------------------------------------------------

export interface TutorOverviewCounts {
  pending_requests_count: number;
  upcoming_lessons_count: number;
  open_issues_count: number;
}

export async function countTutorOverviewMetrics(
  tutorProfileId: string,
  now: Date,
): Promise<TutorOverviewCounts> {
  const db = getDb();

  const [pendingRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(lessons)
    .where(
      and(
        eq(lessons.tutor_profile_id, tutorProfileId),
        eq(lessons.lesson_status, 'requested'),
        or(
          isNull(lessons.request_expires_at),
          gte(lessons.request_expires_at, now),
        ),
      ),
    );

  const [upcomingRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(lessons)
    .where(
      and(
        eq(lessons.tutor_profile_id, tutorProfileId),
        eq(lessons.lesson_status, 'accepted'),
        gte(lessons.scheduled_end_at, now),
      ),
    );

  const [issueRow] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(lessonIssueCases)
    .innerJoin(lessons, eq(lessons.id, lessonIssueCases.lesson_id))
    .where(
      and(
        eq(lessons.tutor_profile_id, tutorProfileId),
        eq(lessonIssueCases.case_status, 'open'),
      ),
    );

  return {
    pending_requests_count: pendingRow?.value ?? 0,
    upcoming_lessons_count: upcomingRow?.value ?? 0,
    open_issues_count: issueRow?.value ?? 0,
  };
}
