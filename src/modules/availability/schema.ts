import { pgTable, uuid, text, timestamp, integer, boolean, date, time, index } from 'drizzle-orm/pg-core';
import { tutorProfiles } from '@/modules/tutors/schema';

// ---------------------------------------------------------------------------
// schedule_policies — tutor-level booking rules that shape slot generation
// ---------------------------------------------------------------------------
export const schedulePolicies = pgTable('schedule_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  tutor_profile_id: uuid('tutor_profile_id')
    .notNull()
    .unique()
    .references(() => tutorProfiles.id),
  timezone: text('timezone').notNull(),
  minimum_notice_minutes: integer('minimum_notice_minutes').notNull().default(480),
  buffer_before_minutes: integer('buffer_before_minutes').notNull().default(0),
  buffer_after_minutes: integer('buffer_after_minutes').notNull().default(0),
  daily_capacity: integer('daily_capacity'),
  weekly_capacity: integer('weekly_capacity'),
  is_accepting_new_students: boolean('is_accepting_new_students').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// availability_rules — recurring weekly availability rules
// ---------------------------------------------------------------------------
export const availabilityRules = pgTable(
  'availability_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tutor_profile_id: uuid('tutor_profile_id')
      .notNull()
      .references(() => tutorProfiles.id),
    day_of_week: integer('day_of_week').notNull(), // 0 = Sunday, 6 = Saturday
    start_local_time: time('start_local_time').notNull(),
    end_local_time: time('end_local_time').notNull(),
    visibility_status: text('visibility_status').notNull().default('active'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_availability_rules_tutor').on(t.tutor_profile_id),
  ],
);

// ---------------------------------------------------------------------------
// availability_overrides — date-specific changes to the recurring schedule
// ---------------------------------------------------------------------------
export const availabilityOverrides = pgTable(
  'availability_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tutor_profile_id: uuid('tutor_profile_id')
      .notNull()
      .references(() => tutorProfiles.id),
    override_date: date('override_date').notNull(),
    override_type: text('override_type').notNull(), // open_extra, blocked, edited_window
    start_local_time: time('start_local_time'),
    end_local_time: time('end_local_time'),
    reason: text('reason'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_availability_overrides_tutor_date').on(t.tutor_profile_id, t.override_date),
  ],
);
