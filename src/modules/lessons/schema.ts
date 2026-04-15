import { pgTable, uuid, text, timestamp, integer, boolean, numeric, index } from 'drizzle-orm/pg-core';
import { appUsers } from '@/modules/accounts/schema';
import { studentProfiles } from '@/modules/accounts/schema';
import { tutorProfiles } from '@/modules/tutors/schema';
import { learningNeeds } from '@/modules/learning-needs/schema';
import { matchCandidates } from '@/modules/matching/schema';

// ---------------------------------------------------------------------------
// lessons — single canonical operational object for booking requests, confirmed
// lessons, upcoming sessions, and completed lesson history.
// Snapshot fields preserve historical meaning even if profiles change later.
// ---------------------------------------------------------------------------
export const lessons = pgTable(
  'lessons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    student_profile_id: uuid('student_profile_id')
      .notNull()
      .references(() => studentProfiles.id),
    tutor_profile_id: uuid('tutor_profile_id')
      .notNull()
      .references(() => tutorProfiles.id),
    learning_need_id: uuid('learning_need_id')
      .references(() => learningNeeds.id),
    match_candidate_id: uuid('match_candidate_id')
      .references(() => matchCandidates.id),

    // Lifecycle state
    lesson_status: text('lesson_status').notNull().default('requested'),

    // Schedule
    scheduled_start_at: timestamp('scheduled_start_at', { withTimezone: true }).notNull(),
    scheduled_end_at: timestamp('scheduled_end_at', { withTimezone: true }).notNull(),
    request_expires_at: timestamp('request_expires_at', { withTimezone: true }),
    lesson_timezone: text('lesson_timezone').notNull(),

    // Meeting
    meeting_method: text('meeting_method'),

    // Pricing snapshot (captured at booking time)
    price_amount: numeric('price_amount'),
    currency_code: text('currency_code').default('USD'),
    is_trial: boolean('is_trial').notNull().default(false),

    // Booking snapshots — preserve historical context
    subject_snapshot: text('subject_snapshot'),
    focus_snapshot: text('focus_snapshot'),
    student_note_snapshot: text('student_note_snapshot'),

    // Lifecycle timestamps
    accepted_at: timestamp('accepted_at', { withTimezone: true }),
    declined_at: timestamp('declined_at', { withTimezone: true }),
    cancelled_at: timestamp('cancelled_at', { withTimezone: true }),
    cancelled_by_app_user_id: uuid('cancelled_by_app_user_id')
      .references(() => appUsers.id),
    completed_at: timestamp('completed_at', { withTimezone: true }),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_lessons_student').on(t.student_profile_id),
    index('idx_lessons_tutor').on(t.tutor_profile_id),
    index('idx_lessons_status').on(t.lesson_status),
    index('idx_lessons_scheduled_start').on(t.scheduled_start_at),
    index('idx_lessons_tutor_status').on(t.tutor_profile_id, t.lesson_status),
  ],
);

// ---------------------------------------------------------------------------
// lesson_status_history — durable transition history for lesson-state changes
// ---------------------------------------------------------------------------
export const lessonStatusHistory = pgTable(
  'lesson_status_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lesson_id: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id),
    from_status: text('from_status'),
    to_status: text('to_status').notNull(),
    changed_by_app_user_id: uuid('changed_by_app_user_id')
      .references(() => appUsers.id),
    change_reason: text('change_reason'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_lesson_status_history_lesson').on(t.lesson_id),
  ],
);

// ---------------------------------------------------------------------------
// lesson_meeting_access — lesson-scoped access record for external meeting links
// ---------------------------------------------------------------------------
export const lessonMeetingAccess = pgTable(
  'lesson_meeting_access',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lesson_id: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id),
    provider: text('provider').notNull(),
    meeting_url: text('meeting_url'),
    normalized_host: text('normalized_host'),
    access_status: text('access_status').notNull().default('active'),
    updated_by_app_user_id: uuid('updated_by_app_user_id')
      .references(() => appUsers.id),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_lesson_meeting_access_lesson').on(t.lesson_id),
  ],
);

// ---------------------------------------------------------------------------
// lesson_reports — private post-lesson continuity record written by the tutor
// ---------------------------------------------------------------------------
export const lessonReports = pgTable(
  'lesson_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lesson_id: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id),
    report_status: text('report_status').notNull().default('draft'),
    goal_summary: text('goal_summary'),
    coverage_summary: text('coverage_summary'),
    student_confidence_signal: text('student_confidence_signal'),
    next_steps_summary: text('next_steps_summary'),
    student_visible_at: timestamp('student_visible_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_lesson_reports_lesson').on(t.lesson_id),
  ],
);

// ---------------------------------------------------------------------------
// lesson_issue_cases — operational case for no-show, wrong-link, technical
// failure, or partial-delivery incidents linked to a lesson.
// Distinct from abuse_reports. One open case per lesson for MVP.
// ---------------------------------------------------------------------------
export const lessonIssueCases = pgTable(
  'lesson_issue_cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    lesson_id: uuid('lesson_id')
      .notNull()
      .references(() => lessons.id),
    case_status: text('case_status').notNull().default('open'),
    student_claim_type: text('student_claim_type'),
    student_reported_at: timestamp('student_reported_at', { withTimezone: true }),
    tutor_claim_type: text('tutor_claim_type'),
    tutor_reported_at: timestamp('tutor_reported_at', { withTimezone: true }),
    resolution_outcome: text('resolution_outcome'),
    resolution_note: text('resolution_note'),
    resolved_by_app_user_id: uuid('resolved_by_app_user_id')
      .references(() => appUsers.id),
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_lesson_issue_cases_lesson').on(t.lesson_id),
    index('idx_lesson_issue_cases_status').on(t.case_status),
  ],
);
