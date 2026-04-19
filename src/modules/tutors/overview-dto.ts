/**
 * Tutor overview DTO types.
 *
 * Class D5 — tutor-owned operational data. These shapes are only safe for the
 * owning tutor actor on their own overview surface. Admin moderation notes,
 * counterparty private evidence, raw payment payloads, and other tutors'
 * operational data must never cross this boundary.
 *
 * The overview reuses the shared `Lesson` and `TutorProfile` objects via a
 * narrow tutor-scoped projection — it does not introduce a second data model
 * for tutor operations.
 */

// ---------------------------------------------------------------------------
// Readiness panel — derived from the 6-gate tutor listing model.
// Phase 1 overview exposes the gates that have concrete schema support.
// Meeting-link and admin-suspension gates are tracked by later tasks.
// ---------------------------------------------------------------------------

export type TutorReadinessGateKey =
  | 'application'
  | 'profile'
  | 'schedule'
  | 'payout';

export type TutorReadinessGateStatus =
  | 'complete'
  | 'in_progress'
  | 'not_started'
  | 'blocked'
  | 'under_review';

export interface TutorReadinessGateDto {
  gate: TutorReadinessGateKey;
  label: string;
  status: TutorReadinessGateStatus;
  hint: string | null;
}

export type TutorListingDisplayStatus =
  | 'not_listed'
  | 'eligible'
  | 'listed'
  | 'paused'
  | 'delisted';

export interface TutorReadinessDto {
  listing_status: TutorListingDisplayStatus;
  listing_message: string;
  gates: TutorReadinessGateDto[];
}

// ---------------------------------------------------------------------------
// Metrics — lesson-derived counts for the operational header.
// Counts are tutor-scoped; no counterparty-private data leaks here.
// ---------------------------------------------------------------------------

export interface TutorOverviewMetricsDto {
  pending_requests_count: number;
  upcoming_lessons_count: number;
  open_issues_count: number;
}

// ---------------------------------------------------------------------------
// Next actions — urgency-ordered list of lesson-led items that answer the
// question "What should I do now?" on the tutor overview.
// ---------------------------------------------------------------------------

export type TutorNextActionKind =
  | 'pending_request'
  | 'upcoming_lesson'
  | 'open_issue';

export interface TutorNextActionStudentDto {
  display_name: string;
  avatar_url: string | null;
}

export interface TutorNextActionDto {
  kind: TutorNextActionKind;
  lesson_id: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  lesson_timezone: string;
  subject_snapshot: string | null;
  focus_snapshot: string | null;
  request_expires_at: string | null;
  student: TutorNextActionStudentDto;
  urgency_label: string;
}

// ---------------------------------------------------------------------------
// Top-level overview shape
// ---------------------------------------------------------------------------

export interface TutorOverviewIdentityDto {
  display_name: string;
  headline: string | null;
  timezone: string;
}

export interface TutorOverviewDto {
  tutor: TutorOverviewIdentityDto;
  readiness: TutorReadinessDto;
  metrics: TutorOverviewMetricsDto;
  next_actions: TutorNextActionDto[];
}

export type TutorOverviewResult =
  | { status: 'ok'; overview: TutorOverviewDto }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };
