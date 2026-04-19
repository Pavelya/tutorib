/**
 * Tutor schedule DTO types.
 *
 * Class D5 — tutor-owned operational data. These shapes are only safe for the
 * owning tutor actor on their own schedule surface. Counterparty-private fields,
 * admin moderation notes, and other tutors' scheduling data must never cross
 * this boundary.
 */

// ---------------------------------------------------------------------------
// Schedule policy — tutor-level booking rules.
// ---------------------------------------------------------------------------

export interface SchedulePolicyDto {
  timezone: string;
  minimum_notice_minutes: number;
  buffer_before_minutes: number;
  buffer_after_minutes: number;
  daily_capacity: number | null;
  weekly_capacity: number | null;
  is_accepting_new_students: boolean;
}

// ---------------------------------------------------------------------------
// Recurring availability rule — one weekly window.
// ---------------------------------------------------------------------------

export type AvailabilityRuleVisibility = 'active' | 'paused';

export interface AvailabilityRuleDto {
  id: string;
  day_of_week: number;
  start_local_time: string;
  end_local_time: string;
  visibility_status: AvailabilityRuleVisibility;
}

// ---------------------------------------------------------------------------
// Default meeting preference — tutor-owned provider + URL pair used as the
// source for new lesson meeting-access snapshots.
// ---------------------------------------------------------------------------

export interface MeetingProviderOptionDto {
  key: string;
  name: string;
}

export interface MeetingPreferenceDto {
  provider_key: string | null;
  default_meeting_url: string | null;
  display_label: string | null;
  is_active: boolean;
  last_validated_at: string | null;
}

// ---------------------------------------------------------------------------
// Top-level schedule DTO returned by the tutor schedule service.
// ---------------------------------------------------------------------------

export interface TutorScheduleDto {
  policy: SchedulePolicyDto;
  rules: AvailabilityRuleDto[];
  meeting_preference: MeetingPreferenceDto;
  meeting_provider_options: MeetingProviderOptionDto[];
}

export type TutorScheduleResult =
  | { status: 'ok'; schedule: TutorScheduleDto }
  | { status: 'unauthenticated' }
  | { status: 'forbidden' };

// ---------------------------------------------------------------------------
// Display constants — single source of truth for the schedule UI.
// ---------------------------------------------------------------------------

export const DAYS_OF_WEEK = [
  { value: 0, short: 'Sun', long: 'Sunday' },
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
] as const;
