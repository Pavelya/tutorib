import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import {
  lessons,
  lessonStatusHistory,
  lessonIssueCases,
  lessonMeetingAccess,
} from './schema';
import { matchCandidates, matchRuns } from '@/modules/matching/schema';
import { learningNeeds } from '@/modules/learning-needs/schema';
import { tutorProfiles } from '@/modules/tutors/schema';
import { appUsers } from '@/modules/accounts/schema';
import { subjects, subjectFocusAreas } from '@/modules/reference/schema';
import { payments } from '@/modules/payments/schema';
import { studentProfiles } from '@/modules/accounts/schema';

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
  tutor_app_user_id: string;
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
      tutor_app_user_id: tutorProfiles.app_user_id,
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

// ---------------------------------------------------------------------------
// Participant-scoped student lesson list + detail (D0 rows internal only)
// ---------------------------------------------------------------------------

export interface StudentLessonListRow {
  lesson_id: string;
  lesson_status: string;
  scheduled_start_at: Date;
  scheduled_end_at: Date;
  request_expires_at: Date | null;
  lesson_timezone: string;
  subject_snapshot: string | null;
  focus_snapshot: string | null;
  price_amount: string | null;
  currency_code: string | null;
  tutor_profile_id: string;
  tutor_public_slug: string | null;
  tutor_display_name: string | null;
  tutor_headline: string | null;
  tutor_avatar_url: string | null;
  has_open_issue: boolean;
}

export interface StudentLessonDetailRow extends StudentLessonListRow {
  student_note_snapshot: string | null;
  issue_case_id: string | null;
  issue_case_status: string | null;
  issue_resolution_outcome: string | null;
  issue_reported_at: Date | null;
  meeting_provider: string | null;
  meeting_url: string | null;
  meeting_access_status: string | null;
  tutor_app_user_id: string;
  payment_id: string | null;
  payment_status: string | null;
  payment_intent_id: string | null;
}

export async function findLessonsForStudent(
  studentProfileId: string,
): Promise<StudentLessonListRow[]> {
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
      price_amount: lessons.price_amount,
      currency_code: lessons.currency_code,
      tutor_profile_id: tutorProfiles.id,
      tutor_public_slug: tutorProfiles.public_slug,
      tutor_display_name: tutorProfiles.display_name,
      tutor_headline: tutorProfiles.headline,
      tutor_app_user_id: tutorProfiles.app_user_id,
      tutor_avatar_url: appUsers.avatar_url,
      issue_case_status: lessonIssueCases.case_status,
    })
    .from(lessons)
    .innerJoin(tutorProfiles, eq(tutorProfiles.id, lessons.tutor_profile_id))
    .leftJoin(appUsers, eq(appUsers.id, tutorProfiles.app_user_id))
    .leftJoin(
      lessonIssueCases,
      and(
        eq(lessonIssueCases.lesson_id, lessons.id),
        eq(lessonIssueCases.case_status, 'open'),
      ),
    )
    .where(eq(lessons.student_profile_id, studentProfileId))
    .orderBy(desc(lessons.scheduled_start_at));

  return rows.map((r) => ({
    lesson_id: r.lesson_id,
    lesson_status: r.lesson_status,
    scheduled_start_at: r.scheduled_start_at,
    scheduled_end_at: r.scheduled_end_at,
    request_expires_at: r.request_expires_at,
    lesson_timezone: r.lesson_timezone,
    subject_snapshot: r.subject_snapshot,
    focus_snapshot: r.focus_snapshot,
    price_amount: r.price_amount,
    currency_code: r.currency_code,
    tutor_profile_id: r.tutor_profile_id,
    tutor_public_slug: r.tutor_public_slug,
    tutor_display_name: r.tutor_display_name,
    tutor_headline: r.tutor_headline,
    tutor_avatar_url: r.tutor_avatar_url,
    has_open_issue: r.issue_case_status !== null,
  }));
}

export async function findLessonDetailForStudent(
  lessonId: string,
  studentProfileId: string,
): Promise<StudentLessonDetailRow | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      lesson_id: lessons.id,
      student_profile_id: lessons.student_profile_id,
      lesson_status: lessons.lesson_status,
      scheduled_start_at: lessons.scheduled_start_at,
      scheduled_end_at: lessons.scheduled_end_at,
      request_expires_at: lessons.request_expires_at,
      lesson_timezone: lessons.lesson_timezone,
      subject_snapshot: lessons.subject_snapshot,
      focus_snapshot: lessons.focus_snapshot,
      student_note_snapshot: lessons.student_note_snapshot,
      price_amount: lessons.price_amount,
      currency_code: lessons.currency_code,
      tutor_profile_id: tutorProfiles.id,
      tutor_public_slug: tutorProfiles.public_slug,
      tutor_display_name: tutorProfiles.display_name,
      tutor_headline: tutorProfiles.headline,
      tutor_app_user_id: tutorProfiles.app_user_id,
      tutor_avatar_url: appUsers.avatar_url,
    })
    .from(lessons)
    .innerJoin(tutorProfiles, eq(tutorProfiles.id, lessons.tutor_profile_id))
    .leftJoin(appUsers, eq(appUsers.id, tutorProfiles.app_user_id))
    .where(eq(lessons.id, lessonId))
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;

  // Object-level authorization: only the owning student may read the detail.
  // Non-matching owner collapses outward to not_found (DTO §27).
  if (row.student_profile_id !== studentProfileId) return undefined;

  // Latest issue case for the lesson (Phase 1 MVP: at most one open per lesson,
  // but we fetch the most recent to surface resolved cases too).
  const issueRows = await db
    .select({
      id: lessonIssueCases.id,
      case_status: lessonIssueCases.case_status,
      resolution_outcome: lessonIssueCases.resolution_outcome,
      student_reported_at: lessonIssueCases.student_reported_at,
    })
    .from(lessonIssueCases)
    .where(eq(lessonIssueCases.lesson_id, lessonId))
    .orderBy(desc(lessonIssueCases.created_at))
    .limit(1);

  const issue = issueRows[0];

  // Meeting access: most recent active row for the lesson (participant-private
  // per meeting-and-calendar architecture §7.5 / §11).
  const meetingRows = await db
    .select({
      provider: lessonMeetingAccess.provider,
      meeting_url: lessonMeetingAccess.meeting_url,
      access_status: lessonMeetingAccess.access_status,
    })
    .from(lessonMeetingAccess)
    .where(eq(lessonMeetingAccess.lesson_id, lessonId))
    .orderBy(desc(lessonMeetingAccess.updated_at))
    .limit(1);

  const meeting = meetingRows[0];

  // Payment: participant-scoped payment for this lesson. Needed so the
  // cancellation flow can release the authorization or issue a refund
  // against the correct Stripe intent.
  const paymentRows = await db
    .select({
      id: payments.id,
      payment_status: payments.payment_status,
      stripe_payment_intent_id: payments.stripe_payment_intent_id,
    })
    .from(payments)
    .where(eq(payments.lesson_id, lessonId))
    .orderBy(desc(payments.created_at))
    .limit(1);

  const payment = paymentRows[0];

  return {
    lesson_id: row.lesson_id,
    lesson_status: row.lesson_status,
    scheduled_start_at: row.scheduled_start_at,
    scheduled_end_at: row.scheduled_end_at,
    request_expires_at: row.request_expires_at,
    lesson_timezone: row.lesson_timezone,
    subject_snapshot: row.subject_snapshot,
    focus_snapshot: row.focus_snapshot,
    student_note_snapshot: row.student_note_snapshot,
    price_amount: row.price_amount,
    currency_code: row.currency_code,
    tutor_profile_id: row.tutor_profile_id,
    tutor_public_slug: row.tutor_public_slug,
    tutor_display_name: row.tutor_display_name,
    tutor_headline: row.tutor_headline,
    tutor_avatar_url: row.tutor_avatar_url,
    tutor_app_user_id: row.tutor_app_user_id,
    has_open_issue: issue?.case_status === 'open',
    issue_case_id: issue?.id ?? null,
    issue_case_status: issue?.case_status ?? null,
    issue_resolution_outcome: issue?.resolution_outcome ?? null,
    issue_reported_at: issue?.student_reported_at ?? null,
    meeting_provider: meeting?.provider ?? null,
    meeting_url: meeting?.meeting_url ?? null,
    meeting_access_status: meeting?.access_status ?? null,
    payment_id: payment?.id ?? null,
    payment_status: payment?.payment_status ?? null,
    payment_intent_id: payment?.stripe_payment_intent_id ?? null,
  };
}

// ---------------------------------------------------------------------------
// Participant cancellation writes
// ---------------------------------------------------------------------------

export interface CancelLessonInput {
  lessonId: string;
  cancelledByAppUserId: string;
  cancelledAt: Date;
  fromStatus: string;
}

export async function markLessonCancelled(
  input: CancelLessonInput,
): Promise<void> {
  const db = getDb();
  await db
    .update(lessons)
    .set({
      lesson_status: 'cancelled',
      cancelled_at: input.cancelledAt,
      cancelled_by_app_user_id: input.cancelledByAppUserId,
      updated_at: input.cancelledAt,
    })
    .where(eq(lessons.id, input.lessonId));
}

// ---------------------------------------------------------------------------
// Participant lesson-issue case writes
// ---------------------------------------------------------------------------

export async function findOpenLessonIssueCase(
  lessonId: string,
): Promise<{ id: string; case_status: string } | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      id: lessonIssueCases.id,
      case_status: lessonIssueCases.case_status,
    })
    .from(lessonIssueCases)
    .where(eq(lessonIssueCases.lesson_id, lessonId))
    .orderBy(desc(lessonIssueCases.created_at))
    .limit(1);
  return rows[0];
}

export interface InsertLessonIssueInput {
  lessonId: string;
  studentClaimType: string;
  studentReportedAt: Date;
}

export async function insertStudentLessonIssueCase(
  input: InsertLessonIssueInput,
): Promise<{ id: string }> {
  const db = getDb();
  const [row] = await db
    .insert(lessonIssueCases)
    .values({
      lesson_id: input.lessonId,
      case_status: 'open',
      student_claim_type: input.studentClaimType,
      student_reported_at: input.studentReportedAt,
    })
    .returning({ id: lessonIssueCases.id });
  return row;
}

// ---------------------------------------------------------------------------
// Payment release/refund helpers used by cancellation
// ---------------------------------------------------------------------------

export async function markPaymentCancelled(paymentId: string): Promise<void> {
  const db = getDb();
  await db
    .update(payments)
    .set({
      payment_status: 'cancelled',
      capture_cancelled_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(payments.id, paymentId));
}

export async function markPaymentRefunded(paymentId: string): Promise<void> {
  const db = getDb();
  await db
    .update(payments)
    .set({
      payment_status: 'refunded',
      refunded_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(payments.id, paymentId));
}

// ---------------------------------------------------------------------------
// Participant-scoped calendar read
// ---------------------------------------------------------------------------
// Participant-safe projection used by the lesson `.ics` export. Returns the
// lesson only when the caller is a participant (student owner or tutor owner).

export interface LessonCalendarRow {
  lesson_id: string;
  lesson_status: string;
  scheduled_start_at: Date;
  scheduled_end_at: Date;
  lesson_timezone: string;
  subject_snapshot: string | null;
  focus_snapshot: string | null;
  tutor_display_name: string | null;
  meeting_url: string | null;
  meeting_access_status: string | null;
}

export async function findLessonCalendarForParticipant(
  lessonId: string,
  appUserId: string,
): Promise<LessonCalendarRow | undefined> {
  const db = getDb();
  const rows = await db
    .select({
      lesson_id: lessons.id,
      lesson_status: lessons.lesson_status,
      scheduled_start_at: lessons.scheduled_start_at,
      scheduled_end_at: lessons.scheduled_end_at,
      lesson_timezone: lessons.lesson_timezone,
      subject_snapshot: lessons.subject_snapshot,
      focus_snapshot: lessons.focus_snapshot,
      student_app_user_id: studentProfiles.app_user_id,
      tutor_app_user_id: tutorProfiles.app_user_id,
      tutor_display_name: tutorProfiles.display_name,
    })
    .from(lessons)
    .innerJoin(studentProfiles, eq(studentProfiles.id, lessons.student_profile_id))
    .innerJoin(tutorProfiles, eq(tutorProfiles.id, lessons.tutor_profile_id))
    .where(eq(lessons.id, lessonId))
    .limit(1);

  const row = rows[0];
  if (!row) return undefined;

  const isParticipant =
    row.student_app_user_id === appUserId || row.tutor_app_user_id === appUserId;
  if (!isParticipant) return undefined;

  const meetingRows = await db
    .select({
      meeting_url: lessonMeetingAccess.meeting_url,
      access_status: lessonMeetingAccess.access_status,
    })
    .from(lessonMeetingAccess)
    .where(eq(lessonMeetingAccess.lesson_id, lessonId))
    .orderBy(desc(lessonMeetingAccess.updated_at))
    .limit(1);

  const meeting = meetingRows[0];

  return {
    lesson_id: row.lesson_id,
    lesson_status: row.lesson_status,
    scheduled_start_at: row.scheduled_start_at,
    scheduled_end_at: row.scheduled_end_at,
    lesson_timezone: row.lesson_timezone,
    subject_snapshot: row.subject_snapshot,
    focus_snapshot: row.focus_snapshot,
    tutor_display_name: row.tutor_display_name,
    meeting_url: meeting?.meeting_url ?? null,
    meeting_access_status: meeting?.access_status ?? null,
  };
}
