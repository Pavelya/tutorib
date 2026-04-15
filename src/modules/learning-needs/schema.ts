import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { studentProfiles } from '@/modules/accounts/schema';
import { subjects, subjectFocusAreas, languages } from '@/modules/reference/schema';

// ---------------------------------------------------------------------------
// learning_needs — normalized record of a student's current IB support request.
// This is the canonical match input object.
// ---------------------------------------------------------------------------
export const learningNeeds = pgTable(
  'learning_needs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    student_profile_id: uuid('student_profile_id')
      .notNull()
      .references(() => studentProfiles.id),
    need_status: text('need_status').notNull().default('active'),
    need_type: text('need_type').notNull(),
    subject_id: uuid('subject_id')
      .references(() => subjects.id),
    subject_focus_area_id: uuid('subject_focus_area_id')
      .references(() => subjectFocusAreas.id),
    urgency_level: text('urgency_level'),
    support_style: text('support_style'),
    language_code: text('language_code')
      .references(() => languages.code),
    timezone: text('timezone'),
    session_frequency_intent: text('session_frequency_intent'),
    free_text_note: text('free_text_note'),
    submitted_at: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
    archived_at: timestamp('archived_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_learning_needs_student').on(t.student_profile_id),
    index('idx_learning_needs_status').on(t.need_status),
    index('idx_learning_needs_subject').on(t.subject_id),
  ],
);
