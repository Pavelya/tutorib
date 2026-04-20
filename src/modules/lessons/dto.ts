/**
 * Lesson and booking DTO types.
 *
 * Class D4 (student private) — only fields approved for an authenticated
 * student viewing their own booking context. Raw match scores, internal
 * ranking fields, and private tutor evidence are excluded.
 *
 * Class D6 (participant-scoped) — lesson list and lesson detail shapes for
 * the student actor participating in the lesson. Tutor private schedule
 * internals, payout details, reliability internals, and private tutor notes
 * are excluded per the DTO boundary map §14.1.
 */

export interface BookingContextTutorDto {
  tutor_profile_id: string;
  public_slug: string;
  display_name: string;
  headline: string | null;
  pricing_summary: string | null;
}

export interface BookingContextDto {
  match_candidate_id: string;
  learning_need_id: string;
  student_profile_id: string;
  student_timezone: string;
  tutor: BookingContextTutorDto;
  subject_snapshot: string | null;
  focus_snapshot: string | null;
  minimum_notice_hours: number;
  default_price_amount: string;
  default_currency_code: string;
}

export type BookingContextResult =
  | { status: 'found'; context: BookingContextDto }
  | { status: 'not_found' }
  | { status: 'forbidden' }
  | { status: 'unauthenticated' };

export interface BookingRequestResultOk {
  ok: true;
  lesson_id: string;
  checkout_url: string;
}

export interface BookingRequestResultErr {
  ok: false;
  code:
    | 'unauthenticated'
    | 'forbidden'
    | 'not_found'
    | 'validation_failed'
    | 'provider_unavailable'
    | 'conflict';
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type BookingRequestResult = BookingRequestResultOk | BookingRequestResultErr;

// ---------------------------------------------------------------------------
// D4/D6: Student lesson list + detail
// ---------------------------------------------------------------------------

// Normalized, role-safe lesson state used by student-facing surfaces.
// Derived from canonical DB status plus time/expiry context.
// Keep this list aligned with the approved lesson state language.
export type StudentLessonState =
  | 'requested'
  | 'upcoming'
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'expired';

// Counterpart summary shown on student lesson surfaces. Participant-safe:
// public profile fields only, plus the slug so the student can cross-link to
// the tutor's public page. No tutor-private data.
export interface LessonTutorSummaryDto {
  tutor_profile_id: string;
  public_slug: string | null;
  display_name: string;
  headline: string | null;
  avatar_url: string | null;
}

// Issue-state display for a lesson. Shaped as a small summary — does NOT
// include counterparty evidence, internal review notes, or resolution
// internals.
export interface LessonIssueStatusDto {
  case_id: string;
  case_status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  resolution_outcome: string | null;
  reported_at: string | null;
}

// Canonical student-reportable lesson-issue reasons per
// `lesson-issue-and-dispute-model-v1.md` §6.
export const STUDENT_LESSON_ISSUE_REASONS = [
  'tutor_absent',
  'wrong_meeting_link',
  'technical_failure',
  'partial_delivery',
] as const;

export type StudentLessonIssueReason =
  (typeof STUDENT_LESSON_ISSUE_REASONS)[number];

// Participant meeting-access summary (D6). Participant-private data;
// never appears in public DTOs or metadata.
export interface LessonMeetingAccessDto {
  provider: string;
  provider_label: string;
  join_url: string | null;
  access_status: 'active' | 'pending' | 'inactive';
}

// Cancellation policy projected onto the current lesson state. The lesson
// detail surface uses this to render an accurate, policy-correct action.
export interface LessonCancellationPolicyDto {
  can_cancel: boolean;
  // Refund posture the student will see once they confirm cancellation.
  // `none` is used when the lesson is not in a cancellable state at all.
  refund_posture: 'full_refund' | 'no_refund' | 'authorization_released' | 'none';
  // Hours between "now" and scheduled_start_at at the moment the DTO was
  // built. Consumer may use this to show a countdown or explain the boundary.
  hours_until_start: number | null;
  // Hard boundary from the approved platform policy (2 hours).
  policy_notice_hours: number;
}

export interface StudentLessonCardDto {
  lesson_id: string;
  lesson_state: StudentLessonState;
  scheduled_start_at: string;
  scheduled_end_at: string;
  lesson_timezone: string;
  subject_snapshot: string | null;
  focus_snapshot: string | null;
  price_amount: string | null;
  currency_code: string | null;
  tutor: LessonTutorSummaryDto;
  has_open_issue: boolean;
}

export interface StudentLessonDetailDto {
  lesson_id: string;
  lesson_state: StudentLessonState;
  scheduled_start_at: string;
  scheduled_end_at: string;
  request_expires_at: string | null;
  lesson_timezone: string;
  subject_snapshot: string | null;
  focus_snapshot: string | null;
  student_note_snapshot: string | null;
  price_amount: string | null;
  currency_code: string | null;
  tutor: LessonTutorSummaryDto;

  // Whether the lesson state + reporting window currently allow opening a
  // new issue. Per the lesson-issue-and-dispute model §6.1, reporting is
  // allowed from scheduled_start_at until 24h after scheduled_end_at.
  is_issue_reportable: boolean;

  // Present when a lesson issue case exists for this lesson.
  issue: LessonIssueStatusDto | null;

  // Participant-private meeting access (provider + join url) for the join
  // action. Null when no meeting access has been recorded yet.
  meeting_access: LessonMeetingAccessDto | null;

  // Policy-driven cancellation posture for the current lesson state.
  cancellation_policy: LessonCancellationPolicyDto;
}

// Result of a participant cancellation attempt.
export interface CancelLessonResultOk {
  ok: true;
  lesson_id: string;
  refund_posture: 'full_refund' | 'no_refund' | 'authorization_released';
}

export interface CancelLessonResultErr {
  ok: false;
  code:
    | 'unauthenticated'
    | 'forbidden'
    | 'not_found'
    | 'invalid_state'
    | 'provider_unavailable';
  message: string;
}

export type CancelLessonResult = CancelLessonResultOk | CancelLessonResultErr;

// Result of a lesson-issue report submission.
export interface ReportLessonIssueResultOk {
  ok: true;
  case_id: string;
}

export interface ReportLessonIssueResultErr {
  ok: false;
  code:
    | 'unauthenticated'
    | 'forbidden'
    | 'not_found'
    | 'window_closed'
    | 'already_reported'
    | 'validation_failed';
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export type ReportLessonIssueResult =
  | ReportLessonIssueResultOk
  | ReportLessonIssueResultErr;

export type StudentLessonListResult =
  | { status: 'ok'; lessons: StudentLessonCardDto[] }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

export type StudentLessonDetailResult =
  | { status: 'ok'; lesson: StudentLessonDetailDto }
  | { status: 'not_found' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

// ---------------------------------------------------------------------------
// D6: Tutor lesson list + detail (participant-scoped, tutor actor)
// ---------------------------------------------------------------------------

// Tutor-side lesson state vocabulary mirrors the student set (same canonical
// state machine), so the shared lesson hub presents one operational model.
// Distinguishing the role here is purely for type safety — a tutor DTO must
// not be passed to a student surface and vice versa.
export type TutorLessonState =
  | 'requested'
  | 'upcoming'
  | 'completed'
  | 'declined'
  | 'cancelled'
  | 'expired';

// Counterpart summary shown on tutor lesson surfaces. Participant-safe:
// student display name, headline timezone snapshot, and avatar only.
export interface LessonStudentSummaryDto {
  student_profile_id: string;
  display_name: string;
  avatar_url: string | null;
  timezone: string | null;
}

export interface TutorLessonCardDto {
  lesson_id: string;
  lesson_state: TutorLessonState;
  scheduled_start_at: string;
  scheduled_end_at: string;
  request_expires_at: string | null;
  lesson_timezone: string;
  subject_snapshot: string | null;
  focus_snapshot: string | null;
  price_amount: string | null;
  currency_code: string | null;
  student: LessonStudentSummaryDto;
  has_open_issue: boolean;
}

export interface TutorLessonDetailDto {
  lesson_id: string;
  lesson_state: TutorLessonState;
  scheduled_start_at: string;
  scheduled_end_at: string;
  request_expires_at: string | null;
  lesson_timezone: string;
  subject_snapshot: string | null;
  focus_snapshot: string | null;
  student_note_snapshot: string | null;
  price_amount: string | null;
  currency_code: string | null;
  student: LessonStudentSummaryDto;

  // Tutor can act on a request only while it is still pending and not expired.
  can_accept: boolean;
  can_decline: boolean;

  // Present when a lesson issue case exists. Same shape as the student side —
  // the case is shared continuity data scoped to the lesson.
  issue: LessonIssueStatusDto | null;

  // Participant meeting access summary. Phase 1 surfaces the link read-only
  // here; meeting-link editing is owned by the schedule task.
  meeting_access: LessonMeetingAccessDto | null;
}

export type TutorLessonListResult =
  | { status: 'ok'; lessons: TutorLessonCardDto[] }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

export type TutorLessonDetailResult =
  | { status: 'ok'; lesson: TutorLessonDetailDto }
  | { status: 'not_found' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

export interface AcceptLessonResultOk {
  ok: true;
  lesson_id: string;
}

export interface AcceptLessonResultErr {
  ok: false;
  code:
    | 'unauthenticated'
    | 'forbidden'
    | 'not_found'
    | 'invalid_state'
    | 'expired'
    | 'provider_unavailable';
  message: string;
}

export type AcceptLessonResult = AcceptLessonResultOk | AcceptLessonResultErr;

export interface DeclineLessonResultOk {
  ok: true;
  lesson_id: string;
}

export interface DeclineLessonResultErr {
  ok: false;
  code:
    | 'unauthenticated'
    | 'forbidden'
    | 'not_found'
    | 'invalid_state'
    | 'provider_unavailable';
  message: string;
}

export type DeclineLessonResult = DeclineLessonResultOk | DeclineLessonResultErr;
