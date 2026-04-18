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
// internals. The issue submission flow itself lives in P1-LESS-002.
export interface LessonIssueStatusDto {
  case_id: string;
  case_status: 'open' | 'under_review' | 'resolved' | 'dismissed';
  resolution_outcome: string | null;
  reported_at: string | null;
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
}

export type StudentLessonListResult =
  | { status: 'ok'; lessons: StudentLessonCardDto[] }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

export type StudentLessonDetailResult =
  | { status: 'ok'; lesson: StudentLessonDetailDto }
  | { status: 'not_found' }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };
