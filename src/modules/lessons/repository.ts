import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { lessons, lessonStatusHistory } from './schema';
import { matchCandidates, matchRuns } from '@/modules/matching/schema';
import { learningNeeds } from '@/modules/learning-needs/schema';
import { tutorProfiles } from '@/modules/tutors/schema';
import { subjects, subjectFocusAreas } from '@/modules/reference/schema';

// ---------------------------------------------------------------------------
// Internal row types — D0, never exported to routes or client components
// ---------------------------------------------------------------------------

export type LessonRow = typeof lessons.$inferSelect;

export interface BookingContextRow {
  match_candidate_id: string;
  match_run_id: string;
  learning_need_id: string;
  student_profile_id: string;
  learning_need_timezone: string | null;
  subject_name: string | null;
  focus_area_name: string | null;
  tutor_profile_id: string;
  tutor_public_slug: string | null;
  tutor_display_name: string | null;
  tutor_headline: string | null;
  tutor_pricing_summary: string | null;
  tutor_listing_status: string;
}

// ---------------------------------------------------------------------------
// Booking-context read (joins match_candidate → match_run → learning_need → tutor)
// ---------------------------------------------------------------------------

export async function findBookingContextByMatchCandidateId(
  matchCandidateId: string,
): Promise<BookingContextRow | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      match_candidate_id: matchCandidates.id,
      match_run_id: matchCandidates.match_run_id,
      learning_need_id: matchRuns.learning_need_id,
      student_profile_id: learningNeeds.student_profile_id,
      learning_need_timezone: learningNeeds.timezone,
      subject_name: subjects.name,
      focus_area_name: subjectFocusAreas.name,
      tutor_profile_id: tutorProfiles.id,
      tutor_public_slug: tutorProfiles.public_slug,
      tutor_display_name: tutorProfiles.display_name,
      tutor_headline: tutorProfiles.headline,
      tutor_pricing_summary: tutorProfiles.pricing_summary,
      tutor_listing_status: tutorProfiles.public_listing_status,
    })
    .from(matchCandidates)
    .innerJoin(matchRuns, eq(matchCandidates.match_run_id, matchRuns.id))
    .innerJoin(learningNeeds, eq(matchRuns.learning_need_id, learningNeeds.id))
    .innerJoin(tutorProfiles, eq(matchCandidates.tutor_profile_id, tutorProfiles.id))
    .leftJoin(subjects, eq(learningNeeds.subject_id, subjects.id))
    .leftJoin(
      subjectFocusAreas,
      eq(learningNeeds.subject_focus_area_id, subjectFocusAreas.id),
    )
    .where(eq(matchCandidates.id, matchCandidateId))
    .limit(1);

  return rows[0];
}

// ---------------------------------------------------------------------------
// Lesson writes
// ---------------------------------------------------------------------------

export interface InsertLessonInput {
  studentProfileId: string;
  tutorProfileId: string;
  learningNeedId: string;
  matchCandidateId: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  requestExpiresAt: Date;
  lessonTimezone: string;
  priceAmount: string;
  currencyCode: string;
  subjectSnapshot: string | null;
  focusSnapshot: string | null;
  studentNoteSnapshot: string | null;
}

export async function insertLessonRequest(
  input: InsertLessonInput,
): Promise<LessonRow> {
  const db = getDb();
  const [row] = await db
    .insert(lessons)
    .values({
      student_profile_id: input.studentProfileId,
      tutor_profile_id: input.tutorProfileId,
      learning_need_id: input.learningNeedId,
      match_candidate_id: input.matchCandidateId,
      lesson_status: 'requested',
      scheduled_start_at: input.scheduledStartAt,
      scheduled_end_at: input.scheduledEndAt,
      request_expires_at: input.requestExpiresAt,
      lesson_timezone: input.lessonTimezone,
      price_amount: input.priceAmount,
      currency_code: input.currencyCode,
      subject_snapshot: input.subjectSnapshot,
      focus_snapshot: input.focusSnapshot,
      student_note_snapshot: input.studentNoteSnapshot,
    })
    .returning();
  return row;
}

export async function insertLessonStatusHistory(input: {
  lessonId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByAppUserId: string;
  changeReason: string;
}): Promise<void> {
  const db = getDb();
  await db.insert(lessonStatusHistory).values({
    lesson_id: input.lessonId,
    from_status: input.fromStatus,
    to_status: input.toStatus,
    changed_by_app_user_id: input.changedByAppUserId,
    change_reason: input.changeReason,
  });
}

export async function findLessonById(
  lessonId: string,
): Promise<LessonRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(lessons)
    .where(eq(lessons.id, lessonId))
    .limit(1);
  return rows[0];
}
